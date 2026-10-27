import "server-only";
import { db } from "@/lib/db";
import {
  OrderStatus, PaymentMethod, PaymentStatus, StockMovementType,
} from "@/prisma/generated/enums";
import { toCents, fromCents, resolvePrice, activeFlashSaleFilter } from "@/lib/pricing";
import { shippingCost, SHIPPING_METHODS, type ShippingMethodId } from "@/lib/shipping";
import { validateCoupon } from "@/lib/services/coupons";
import { ServiceError } from "@/lib/services/auth";
import { STATUS_LABEL, NEXT_STATUS } from "@/lib/order-status";

export { STATUS_LABEL, NEXT_STATUS };


export interface CreateOrderInput {
  userId: string;
  addressId: string;
  shippingMethod: ShippingMethodId;
  paymentMethod: keyof typeof PaymentMethod;
}

/**
 * Fecha o pedido. Tudo acontece numa transação só: qualquer falha — inclusive
 * estoque que acabou entre a tela e o clique — desfaz o pedido inteiro.
 *
 * Os preços são recalculados aqui no servidor. Nada do que o cliente enviou
 * sobre valores é considerado.
 */
export async function createOrder(input: CreateOrderInput) {
  const endereco = await db.address.findFirst({
    where: { id: input.addressId, userId: input.userId },
  });
  if (!endereco) throw new ServiceError("Endereço de entrega inválido.", "addressId");

  const cart = await db.cart.findUnique({
    where: { userId: input.userId },
    include: {
      coupon: true,
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: {
                  brand: { select: { name: true } },
                  images: { where: { isPrimary: true }, take: 1 },
                  flashItems: {
                    where: activeFlashSaleFilter(),
                    include: { flashSale: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new ServiceError("Seu carrinho está vazio.");
  }

  // Recalcula preços e monta os snapshots do pedido.
  const itens = cart.items.map((item) => {
    const { variant } = item;
    const { product } = variant;
    const flash = product.flashItems[0] ?? null;

    if (!product.isActive || !variant.isActive) {
      throw new ServiceError(`${product.name} não está mais disponível.`);
    }

    const preco = resolvePrice({
      price: product.price,
      salePrice: product.salePrice,
      priceDelta: variant.priceDelta,
      flashPrice: flash?.promoPrice,
    });

    return {
      variantId: variant.id,
      productId: product.id,
      flashItemId: flash?.id ?? null,
      productName: product.name,
      variantName: variant.name,
      brandName: product.brand.name,
      sku: variant.sku,
      productSlug: product.slug,
      imageUrl: product.images[0]?.url ?? null,
      unitPrice: preco.currentPrice,
      listPrice: preco.listPrice,
      quantity: item.quantity,
      lineTotal: fromCents(toCents(preco.currentPrice) * item.quantity),
    };
  });

  const subtotal = fromCents(itens.reduce((s, i) => s + toCents(i.lineTotal), 0));

  // O cupom é revalidado no fechamento: pode ter expirado desde que foi aplicado.
  let discount = 0;
  let couponId: string | null = null;
  let couponCode: string | null = null;

  if (cart.coupon) {
    const validacao = await validateCoupon(cart.coupon.code, subtotal, input.userId);
    if (!validacao.valid) {
      throw new ServiceError(`Cupom ${cart.coupon.code}: ${validacao.reason}`);
    }
    discount = validacao.discount;
    couponId = cart.coupon.id;
    couponCode = cart.coupon.code;
  }

  const shipping = shippingCost(input.shippingMethod, subtotal);
  const total = fromCents(
    Math.max(0, toCents(subtotal) - toCents(discount)) + toCents(shipping),
  );

  const metodoEntrega =
    SHIPPING_METHODS.find((m) => m.id === input.shippingMethod)?.label ?? "Padrão";

  return db.$transaction(async (tx) => {
    // Baixa de estoque com trava no próprio UPDATE: se outra compra levou as
    // últimas unidades entre a tela e o clique, nenhuma linha é afetada e o
    // pedido inteiro é desfeito.
    for (const item of itens) {
      const afetadas = await tx.productVariant.updateMany({
        where: { id: item.variantId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });

      if (afetadas.count === 0) {
        const atual = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: { stock: true },
        });
        throw new ServiceError(
          `${item.productName} — ${item.variantName}: restam apenas ${atual?.stock ?? 0} unidade(s).`,
        );
      }
    }

    const pedido = await tx.order.create({
      data: {
        userId: input.userId,
        status: OrderStatus.PENDING_PAYMENT,
        addressId: endereco.id,
        shipRecipient: endereco.recipient,
        shipZipCode: endereco.zipCode,
        shipStreet: endereco.street,
        shipNumber: endereco.number,
        shipComplement: endereco.complement,
        shipDistrict: endereco.district,
        shipCity: endereco.city,
        shipState: endereco.state,
        shippingMethod: metodoEntrega,
        subtotal,
        discountTotal: discount,
        shippingTotal: shipping,
        total,
        couponId,
        couponCode,
        items: {
          create: itens.map((i) => ({
            variantId: i.variantId,
            productName: i.productName,
            variantName: i.variantName,
            brandName: i.brandName,
            sku: i.sku,
            productSlug: i.productSlug,
            imageUrl: i.imageUrl,
            unitPrice: i.unitPrice,
            listPrice: i.listPrice,
            quantity: i.quantity,
            lineTotal: i.lineTotal,
          })),
        },
        payment: {
          create: {
            method: PaymentMethod[input.paymentMethod],
            status: PaymentStatus.PENDING,
            amount: total,
          },
        },
        history: {
          create: { status: OrderStatus.PENDING_PAYMENT, note: "Pedido realizado" },
        },
      },
    });

    // Movimentação de estoque e contadores de venda.
    for (const item of itens) {
      const variante = await tx.productVariant.findUniqueOrThrow({
        where: { id: item.variantId },
        select: { stock: true },
      });

      await tx.stockMovement.create({
        data: {
          variantId: item.variantId,
          type: StockMovementType.SALE,
          quantity: item.quantity,
          stockAfter: variante.stock,
          reason: "Venda",
          orderId: pedido.id,
        },
      });

      await tx.product.update({
        where: { id: item.productId },
        data: { soldCount: { increment: item.quantity } },
      });

      if (item.flashItemId) {
        await tx.flashSaleItem.update({
          where: { id: item.flashItemId },
          data: { soldCount: { increment: item.quantity } },
        });
      }
    }

    if (couponId) {
      await tx.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      });
      await tx.couponRedemption.create({
        data: { couponId, userId: input.userId, orderId: pedido.id, amount: discount },
      });
    }

    // Carrinho esvaziado só depois de tudo dar certo.
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.cart.update({ where: { id: cart.id }, data: { couponId: null } });

    return { id: pedido.id, number: pedido.number, total: Number(pedido.total) };
  });
}

// ───────────────────────── Consultas ────────────────────────────

export async function listUserOrders(userId: string) {
  return db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: { select: { id: true, productName: true, imageUrl: true, quantity: true } },
      payment: { select: { status: true, method: true } },
    },
  });
}

export async function getUserOrder(userId: string, number: number) {
  return db.order.findFirst({
    where: { userId, number },
    include: {
      items: true,
      payment: true,
      history: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function getOrderById(orderId: string) {
  return db.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      payment: true,
      history: { orderBy: { createdAt: "asc" } },
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
}

// ─────────────────────── Mudança de status ──────────────────────

/**
 * Cancelar devolve o estoque — é o inverso exato da baixa feita na criação.
 */
export async function cancelOrder(orderId: string, changedById?: string, note?: string) {
  const pedido = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!pedido) throw new ServiceError("Pedido não encontrado.");

  if (pedido.status === OrderStatus.CANCELLED) {
    throw new ServiceError("Este pedido já está cancelado.");
  }
  if (pedido.status === OrderStatus.DELIVERED) {
    throw new ServiceError("Pedido entregue não pode ser cancelado.");
  }

  await db.$transaction(async (tx) => {
    for (const item of pedido.items) {
      if (!item.variantId) continue;

      const variante = await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });

      await tx.stockMovement.create({
        data: {
          variantId: item.variantId,
          type: StockMovementType.CANCELLATION,
          quantity: item.quantity,
          stockAfter: variante.stock,
          reason: "Cancelamento de pedido",
          orderId: pedido.id,
          createdById: changedById,
        },
      });

      await tx.product.update({
        where: { id: variante.productId },
        data: { soldCount: { decrement: item.quantity } },
      });
    }

    // O uso do cupom é devolvido junto com o pedido.
    if (pedido.couponId) {
      await tx.coupon.update({
        where: { id: pedido.couponId },
        data: { usedCount: { decrement: 1 } },
      });
      await tx.couponRedemption.deleteMany({ where: { orderId: pedido.id } });
    }

    await tx.order.update({
      where: { id: pedido.id },
      data: { status: OrderStatus.CANCELLED, cancelledAt: new Date() },
    });

    await tx.payment.updateMany({
      where: { orderId: pedido.id },
      data: { status: PaymentStatus.CANCELLED },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: pedido.id,
        status: OrderStatus.CANCELLED,
        note: note ?? "Pedido cancelado",
        changedById,
      },
    });
  });
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  changedById: string,
  note?: string,
) {
  const pedido = await db.order.findUnique({ where: { id: orderId } });
  if (!pedido) throw new ServiceError("Pedido não encontrado.");

  if (status === OrderStatus.CANCELLED) {
    return cancelOrder(orderId, changedById, note);
  }

  if (!NEXT_STATUS[pedido.status].includes(status)) {
    throw new ServiceError(
      `Não é possível ir de "${STATUS_LABEL[pedido.status]}" para "${STATUS_LABEL[status]}".`,
    );
  }

  await db.$transaction([
    db.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(status === OrderStatus.PAID && !pedido.paidAt ? { paidAt: new Date() } : {}),
      },
    }),
    db.orderStatusHistory.create({
      data: { orderId, status, note: note ?? STATUS_LABEL[status], changedById },
    }),
  ]);
}
