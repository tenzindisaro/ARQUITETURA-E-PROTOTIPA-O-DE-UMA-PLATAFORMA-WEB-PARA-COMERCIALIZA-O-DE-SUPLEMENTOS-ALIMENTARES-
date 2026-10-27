import "dotenv/config";
import { db } from "@/lib/db";
import { createOrder, cancelOrder, updateOrderStatus } from "@/lib/services/orders";
import { settlePayment } from "@/lib/services/payments";
import { ServiceError } from "@/lib/services/auth";
import { OrderStatus } from "@/prisma/generated/enums";

let falhas = 0;
function check(nome: string, ok: boolean, extra = "") {
  console.log(`${ok ? "  ok  " : "  FALHA"} ${nome}${extra ? ` — ${extra}` : ""}`);
  if (!ok) falhas++;
}
async function expectError(nome: string, fn: () => Promise<unknown>, trecho?: string) {
  try { await fn(); check(nome, false, "não lançou erro"); }
  catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    check(nome, e instanceof ServiceError && (!trecho || msg.includes(trecho)), msg);
  }
}

async function main() {
  const user = await db.user.findUniqueOrThrow({ where: { email: "camila@email.com" } });
  const endereco = await db.address.findFirstOrThrow({ where: { userId: user.id } });

  async function montarCarrinho(itens: Array<{ variantId: string; quantity: number }>, cupom?: string) {
    await db.cart.deleteMany({ where: { userId: user.id } });
    const cupomId = cupom
      ? (await db.coupon.findUniqueOrThrow({ where: { code: cupom } })).id
      : null;
    return db.cart.create({
      data: { userId: user.id, couponId: cupomId, items: { create: itens } },
    });
  }

  const variante = await db.productVariant.findFirstOrThrow({
    where: { stock: { gte: 10 }, isActive: true },
    include: { product: true },
  });
  const estoqueInicial = variante.stock;

  console.log("\n── Fechamento do pedido ──");
  await montarCarrinho([{ variantId: variante.id, quantity: 3 }]);
  const pedido = await createOrder({
    userId: user.id, addressId: endereco.id,
    shippingMethod: "standard", paymentMethod: "PIX",
  });
  check("pedido criado com número sequencial", pedido.number > 0, `#${pedido.number}`);

  const depois = await db.productVariant.findUniqueOrThrow({ where: { id: variante.id } });
  check("estoque baixado na criação", depois.stock === estoqueInicial - 3,
    `${estoqueInicial} → ${depois.stock}`);

  const mov = await db.stockMovement.findFirst({
    where: { orderId: pedido.id, variantId: variante.id },
  });
  check("movimentação de venda registrada", mov?.type === "SALE" && mov.quantity === 3);
  check("saldo da movimentação bate com o estoque", mov?.stockAfter === depois.stock);

  const carrinho = await db.cart.findUnique({ where: { userId: user.id }, include: { items: true } });
  check("carrinho esvaziado após o pedido", carrinho?.items.length === 0);

  const completo = await db.order.findUniqueOrThrow({
    where: { id: pedido.id }, include: { items: true, payment: true, history: true },
  });
  check("snapshot do produto gravado no item",
    completo.items[0].productName === variante.product.name &&
    completo.items[0].sku === variante.sku);
  check("snapshot do endereço gravado no pedido",
    completo.shipStreet === endereco.street && completo.shipCity === endereco.city);
  check("pagamento criado como PENDING", completo.payment?.status === "PENDING");
  check("status inicial é PENDING_PAYMENT", completo.status === "PENDING_PAYMENT");
  check("histórico começa com uma entrada", completo.history.length === 1);
  check("total = subtotal - desconto + frete",
    Number(completo.total) === Number(completo.subtotal) - Number(completo.discountTotal) + Number(completo.shippingTotal));

  console.log("\n── Snapshot é imutável ──");
  const nomeOriginal = variante.product.name;
  await db.product.update({ where: { id: variante.productId }, data: { name: "NOME ALTERADO" } });
  const apos = await db.orderItem.findFirstOrThrow({ where: { orderId: pedido.id } });
  check("renomear o produto não altera o pedido", apos.productName === nomeOriginal);
  await db.product.update({ where: { id: variante.productId }, data: { name: nomeOriginal } });

  console.log("\n── Pagamento simulado ──");
  const recusa = await settlePayment(pedido.id, user.id, false);
  check("recusa não aprova o pedido", !recusa.approved);
  const posRecusa = await db.order.findUniqueOrThrow({ where: { id: pedido.id }, include: { payment: true } });
  check("pedido segue aguardando pagamento", posRecusa.status === "PENDING_PAYMENT");
  check("pagamento marcado como REJECTED", posRecusa.payment?.status === "REJECTED");

  const aprova = await settlePayment(pedido.id, user.id, true);
  check("aprovação muda o pedido para PAID", aprova.approved);
  const posAprova = await db.order.findUniqueOrThrow({ where: { id: pedido.id }, include: { payment: true } });
  check("status do pedido é PAID", posAprova.status === "PAID");
  check("pagamento APPROVED com data", posAprova.payment?.status === "APPROVED" && posAprova.paidAt !== null);
  await expectError("não dá para pagar duas vezes",
    () => settlePayment(pedido.id, user.id, true), "não está aguardando pagamento");

  console.log("\n── Transição de status ──");
  const admin = await db.user.findUniqueOrThrow({ where: { email: "admin@supz.com.br" } });
  await expectError("não pode pular de PAID para DELIVERED",
    () => updateOrderStatus(pedido.id, OrderStatus.DELIVERED, admin.id), "Não é possível");
  await updateOrderStatus(pedido.id, OrderStatus.PROCESSING, admin.id);
  await updateOrderStatus(pedido.id, OrderStatus.SHIPPED, admin.id);
  const enviado = await db.order.findUniqueOrThrow({ where: { id: pedido.id }, include: { history: true } });
  check("status avança pela trilha permitida", enviado.status === "SHIPPED");
  // 5 entradas: criação, recusa do pagamento, aprovação, preparação e envio.
  check("cada evento gera histórico", enviado.history.length === 5,
    enviado.history.map((h) => h.note).join(" → "));

  console.log("\n── Cancelamento devolve estoque ──");
  await montarCarrinho([{ variantId: variante.id, quantity: 2 }], "SUPZ10");
  const antesCancel = (await db.productVariant.findUniqueOrThrow({ where: { id: variante.id } })).stock;
  const cupomAntes = (await db.coupon.findUniqueOrThrow({ where: { code: "SUPZ10" } })).usedCount;
  const pedido2 = await createOrder({
    userId: user.id, addressId: endereco.id, shippingMethod: "express", paymentMethod: "BOLETO",
  });
  const durante = (await db.productVariant.findUniqueOrThrow({ where: { id: variante.id } })).stock;
  check("estoque baixa ao comprar", durante === antesCancel - 2);
  check("uso do cupom é contabilizado",
    (await db.coupon.findUniqueOrThrow({ where: { code: "SUPZ10" } })).usedCount === cupomAntes + 1);
  check("redemption registrada",
    (await db.couponRedemption.count({ where: { orderId: pedido2.id } })) === 1);

  await cancelOrder(pedido2.id, user.id, "Teste");
  const posCancel = (await db.productVariant.findUniqueOrThrow({ where: { id: variante.id } })).stock;
  check("estoque volta ao cancelar", posCancel === antesCancel, `${durante} → ${posCancel}`);
  check("uso do cupom é devolvido",
    (await db.coupon.findUniqueOrThrow({ where: { code: "SUPZ10" } })).usedCount === cupomAntes);
  check("redemption removida",
    (await db.couponRedemption.count({ where: { orderId: pedido2.id } })) === 0);
  const cancelado = await db.order.findUniqueOrThrow({ where: { id: pedido2.id }, include: { payment: true } });
  check("pagamento marcado como CANCELLED", cancelado.payment?.status === "CANCELLED");
  await expectError("não dá para cancelar duas vezes",
    () => cancelOrder(pedido2.id, user.id), "já está cancelado");

  console.log("\n── Estoque insuficiente ──");
  // A condição é montada pelo teste, não herdada do seed.
  const escasso = await db.productVariant.findFirstOrThrow({
    where: { isActive: true, id: { not: variante.id } },
  });
  const estoqueEscasso = escasso.stock;
  await db.productVariant.update({ where: { id: escasso.id }, data: { stock: 4 } });
  await montarCarrinho([{ variantId: escasso.id, quantity: 4 }]);
  // Alguém leva as últimas unidades entre a montagem do carrinho e o clique.
  await db.productVariant.update({ where: { id: escasso.id }, data: { stock: 1 } });
  await expectError("pedido é recusado quando o estoque acabou",
    () => createOrder({ userId: user.id, addressId: endereco.id, shippingMethod: "standard", paymentMethod: "PIX" }),
    "restam apenas");
  const naoMexeu = await db.productVariant.findUniqueOrThrow({ where: { id: escasso.id } });
  check("estoque não é alterado quando o pedido falha", naoMexeu.stock === 1);
  await db.productVariant.update({ where: { id: escasso.id }, data: { stock: estoqueEscasso } });

  console.log("\n── Carrinho vazio e endereço de outro usuário ──");
  await db.cart.deleteMany({ where: { userId: user.id } });
  await expectError("carrinho vazio é recusado",
    () => createOrder({ userId: user.id, addressId: endereco.id, shippingMethod: "standard", paymentMethod: "PIX" }),
    "vazio");
  const outro = await db.address.findFirstOrThrow({ where: { userId: { not: user.id } } });
  await montarCarrinho([{ variantId: variante.id, quantity: 1 }]);
  await expectError("endereço de outro usuário é recusado",
    () => createOrder({ userId: user.id, addressId: outro.id, shippingMethod: "standard", paymentMethod: "PIX" }),
    "inválido");

  // Limpeza
  await db.order.deleteMany({ where: { id: { in: [pedido.id, pedido2.id] } } });
  await db.cart.deleteMany({ where: { userId: user.id } });
  await db.productVariant.update({ where: { id: variante.id }, data: { stock: estoqueInicial } });

  console.log(`\n${falhas === 0 ? "Todos os testes passaram." : `${falhas} FALHA(S).`}\n`);
  process.exit(falhas === 0 ? 0 : 1);
}

main().finally(() => db.$disconnect());
