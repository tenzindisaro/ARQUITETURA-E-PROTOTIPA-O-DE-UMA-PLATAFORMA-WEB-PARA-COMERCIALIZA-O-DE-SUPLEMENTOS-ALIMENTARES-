import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/prisma/generated/client";
import { resolvePrice, activeFlashSaleFilter, toCents, fromCents } from "@/lib/pricing";
import { validateCoupon } from "@/lib/services/coupons";
import { shippingCost, FREE_SHIPPING_THRESHOLD, type ShippingMethodId } from "@/lib/shipping";
import { readCartToken, writeCartToken, newCartToken, clearCartToken } from "@/lib/cart-session";
import { ServiceError } from "@/lib/services/auth";

/**
 * A sessão é resolvida sob demanda, com import dinâmico: importar `@/lib/auth`
 * no topo arrastaria o runtime de navegação do Next para dentro deste módulo,
 * que é puro acesso a dados.
 *
 * Usa o usuário conferido contra o banco, não o id cru do token: `Cart.userId`
 * é chave estrangeira, e um token apontando para uma conta apagada faria a
 * criação do carrinho estourar.
 */
async function currentUserId(): Promise<string | null> {
  const { getCurrentUser } = await import("@/lib/current-user");
  const user = await getCurrentUser();
  return user?.id ?? null;
}

const cartInclude = {
  coupon: true,
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      variant: {
        include: {
          product: {
            include: {
              brand: { select: { name: true } },
              images: { where: { isPrimary: true }, take: 1 },
              flashItems: { where: activeFlashSaleFilter(), take: 1 },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export interface CartLine {
  itemId: string;
  variantId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  brandName: string;
  sku: string;
  imageUrl: string | null;
  quantity: number;
  stock: number;
  listPrice: number;
  unitPrice: number;
  lineTotal: number;
  hasDiscount: boolean;
  isFlash: boolean;
  /** Verdadeiro quando a quantidade no carrinho passou do estoque disponível. */
  exceedsStock: boolean;
}

export interface CartSummary {
  cartId: string | null;
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon: { code: string; description: string | null } | null;
  /** Preenchido quando o cupom guardado deixou de valer. */
  couponWarning: string | null;
  freeShippingThreshold: number;
  missingForFreeShipping: number;
  hasStockIssue: boolean;
}

export const EMPTY_CART: CartSummary = {
  cartId: null,
  lines: [],
  itemCount: 0,
  subtotal: 0,
  discount: 0,
  shipping: 0,
  total: 0,
  coupon: null,
  couponWarning: null,
  freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  missingForFreeShipping: FREE_SHIPPING_THRESHOLD,
  hasStockIssue: false,
};

// ───────────────────────── Localização ──────────────────────────

/** Somente leitura: nunca cria carrinho nem escreve cookie. */
async function findCart(): Promise<CartWithItems | null> {
  const userId = await currentUserId();

  if (userId) {
    return db.cart.findUnique({ where: { userId }, include: cartInclude });
  }

  const token = await readCartToken();
  if (!token) return null;

  return db.cart.findUnique({ where: { sessionToken: token }, include: cartInclude });
}

/**
 * Obtém ou cria o carrinho. Escreve cookie quando o visitante ainda não tem um,
 * então só pode ser chamada de Server Action ou Route Handler.
 */
export async function ensureCart(): Promise<CartWithItems> {
  const userId = await currentUserId();

  if (userId) {
    const existente = await db.cart.findUnique({
      where: { userId },
      include: cartInclude,
    });
    if (existente) return existente;

    return db.cart.create({ data: { userId }, include: cartInclude });
  }

  const token = await readCartToken();
  if (token) {
    const existente = await db.cart.findUnique({
      where: { sessionToken: token },
      include: cartInclude,
    });
    if (existente) return existente;
  }

  const novoToken = newCartToken();
  await writeCartToken(novoToken);
  return db.cart.create({ data: { sessionToken: novoToken }, include: cartInclude });
}

// ───────────────────────── Cálculo ──────────────────────────────

function buildLines(cart: CartWithItems): CartLine[] {
  return cart.items.map((item) => {
    const { variant } = item;
    const { product } = variant;
    const flash = product.flashItems[0] ?? null;

    const preco = resolvePrice({
      price: product.price,
      salePrice: product.salePrice,
      priceDelta: variant.priceDelta,
      flashPrice: flash?.promoPrice,
    });

    return {
      itemId: item.id,
      variantId: variant.id,
      productName: product.name,
      productSlug: product.slug,
      variantName: variant.name,
      brandName: product.brand.name,
      sku: variant.sku,
      imageUrl: product.images[0]?.url ?? null,
      quantity: item.quantity,
      stock: variant.stock,
      listPrice: preco.listPrice,
      unitPrice: preco.currentPrice,
      lineTotal: fromCents(toCents(preco.currentPrice) * item.quantity),
      hasDiscount: preco.hasDiscount,
      isFlash: preco.isFlash,
      exceedsStock: item.quantity > variant.stock,
    };
  });
}

/**
 * Resumo do carrinho com os preços recalculados agora. O carrinho nunca guarda
 * preço: se o produto entrou em promoção depois de adicionado, o cliente vê o
 * preço novo.
 */
export async function getCartSummary(
  shippingMethod: ShippingMethodId = "standard",
): Promise<CartSummary> {
  const cart = await findCart();
  if (!cart || cart.items.length === 0) {
    return { ...EMPTY_CART, cartId: cart?.id ?? null };
  }

  const lines = buildLines(cart);
  const subtotal = fromCents(lines.reduce((s, l) => s + toCents(l.lineTotal), 0));

  let discount = 0;
  let coupon: CartSummary["coupon"] = null;
  let couponWarning: string | null = null;

  // O cupom é revalidado a cada exibição: pode ter expirado ou esgotado
  // depois de aplicado.
  if (cart.coupon) {
    const validacao = await validateCoupon(cart.coupon.code, subtotal, cart.userId ?? undefined);
    if (validacao.valid) {
      discount = validacao.discount;
      coupon = { code: cart.coupon.code, description: cart.coupon.description };
    } else {
      couponWarning = validacao.reason ?? "O cupom aplicado não vale mais.";
      await db.cart.update({ where: { id: cart.id }, data: { couponId: null } });
    }
  }

  const shipping = shippingCost(shippingMethod, subtotal);
  const total = fromCents(Math.max(0, toCents(subtotal) - toCents(discount)) + toCents(shipping));

  return {
    cartId: cart.id,
    lines,
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
    subtotal,
    discount,
    shipping,
    total,
    coupon,
    couponWarning,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    missingForFreeShipping: Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal),
    hasStockIssue: lines.some((l) => l.exceedsStock),
  };
}

/** Contador do cabeçalho. Consulta enxuta, sem montar o resumo inteiro. */
export async function getCartItemCount(): Promise<number> {
  const userId = await currentUserId();
  const token = userId ? null : await readCartToken();

  if (!userId && !token) return 0;

  const resultado = await db.cartItem.aggregate({
    where: userId ? { cart: { userId } } : { cart: { sessionToken: token! } },
    _sum: { quantity: true },
  });

  return resultado._sum.quantity ?? 0;
}

// ───────────────────────── Mutações ─────────────────────────────

export async function addItem(variantId: string, quantity = 1) {
  if (quantity < 1) throw new ServiceError("Quantidade inválida.");

  const variante = await db.productVariant.findFirst({
    where: { id: variantId, isActive: true, product: { isActive: true } },
    select: { id: true, stock: true, name: true, product: { select: { name: true } } },
  });
  if (!variante) throw new ServiceError("Produto indisponível.");

  const cart = await ensureCart();
  const existente = cart.items.find((i) => i.variantId === variantId);
  const novaQuantidade = (existente?.quantity ?? 0) + quantity;

  if (novaQuantidade > variante.stock) {
    throw new ServiceError(
      variante.stock === 0
        ? "Produto esgotado."
        : `Restam apenas ${variante.stock} unidade(s) de ${variante.product.name} — ${variante.name}.`,
    );
  }

  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, quantity },
    update: { quantity: novaQuantidade },
  });
}

export async function updateItemQuantity(itemId: string, quantity: number) {
  const cart = await ensureCart();
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) throw new ServiceError("Item não está no seu carrinho.");

  if (quantity < 1) {
    await db.cartItem.delete({ where: { id: itemId } });
    return;
  }
  if (quantity > item.variant.stock) {
    throw new ServiceError(`Estoque disponível: ${item.variant.stock} unidade(s).`);
  }

  await db.cartItem.update({ where: { id: itemId }, data: { quantity } });
}

export async function removeItem(itemId: string) {
  const cart = await ensureCart();
  if (!cart.items.some((i) => i.id === itemId)) {
    throw new ServiceError("Item não está no seu carrinho.");
  }
  await db.cartItem.delete({ where: { id: itemId } });
}

export async function applyCoupon(code: string) {
  const cart = await ensureCart();
  if (cart.items.length === 0) throw new ServiceError("Adicione produtos antes de aplicar um cupom.");

  const lines = buildLines(cart);
  const subtotal = fromCents(lines.reduce((s, l) => s + toCents(l.lineTotal), 0));

  const validacao = await validateCoupon(code, subtotal, cart.userId ?? undefined);
  if (!validacao.valid) throw new ServiceError(validacao.reason ?? "Cupom inválido.");

  await db.cart.update({
    where: { id: cart.id },
    data: { couponId: validacao.coupon!.id },
  });

  return validacao;
}

export async function removeCoupon() {
  const cart = await ensureCart();
  await db.cart.update({ where: { id: cart.id }, data: { couponId: null } });
}

/**
 * Mescla o carrinho de visitante no carrinho do usuário durante o login.
 * Somar quantidades pode passar do estoque, então cada linha é limitada.
 * Chamada pelo evento `signIn` do Auth.js.
 */
export async function mergeGuestCart(userId: string, guestToken: string) {
  const convidado = await db.cart.findUnique({
    where: { sessionToken: guestToken },
    include: { items: { include: { variant: { select: { stock: true } } } } },
  });

  if (!convidado) return;

  if (convidado.items.length === 0) {
    await db.cart.delete({ where: { id: convidado.id } });
    return;
  }

  const doUsuario =
    (await db.cart.findUnique({ where: { userId }, include: { items: true } })) ??
    (await db.cart.create({ data: { userId }, include: { items: true } }));

  await db.$transaction(async (tx) => {
    for (const item of convidado.items) {
      const jaTinha = doUsuario.items.find((i) => i.variantId === item.variantId);
      const somada = (jaTinha?.quantity ?? 0) + item.quantity;
      const quantidade = Math.min(somada, item.variant.stock);
      if (quantidade < 1) continue;

      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId: doUsuario.id, variantId: item.variantId } },
        create: { cartId: doUsuario.id, variantId: item.variantId, quantity: quantidade },
        update: { quantity: quantidade },
      });
    }

    // O cupom do visitante só é herdado se o usuário ainda não tinha um.
    if (convidado.couponId && !doUsuario.couponId) {
      await tx.cart.update({
        where: { id: doUsuario.id },
        data: { couponId: convidado.couponId },
      });
    }

    await tx.cart.delete({ where: { id: convidado.id } });
  });
}

export async function clearCart(cartId: string) {
  await db.cartItem.deleteMany({ where: { cartId } });
  await db.cart.update({ where: { id: cartId }, data: { couponId: null } });
}

export { clearCartToken };
