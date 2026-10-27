import "dotenv/config";
import { db } from "@/lib/db";
import { mergeGuestCart } from "@/lib/services/cart";
import { validateCoupon, computeDiscount } from "@/lib/services/coupons";
import { DiscountType } from "@/prisma/generated/enums";

let falhas = 0;
function check(nome: string, ok: boolean, extra = "") {
  console.log(`${ok ? "  ok  " : "  FALHA"} ${nome}${extra ? ` — ${extra}` : ""}`);
  if (!ok) falhas++;
}

async function main() {
  const user = await db.user.findUniqueOrThrow({ where: { email: "rafael@email.com" } });
  const variantes = await db.productVariant.findMany({
    where: { stock: { gte: 10 } }, take: 3, orderBy: { sku: "asc" },
  });
  const [v1, v2, v3] = variantes;

  console.log("\n── Merge do carrinho de visitante ──");
  await db.cart.deleteMany({ where: { OR: [{ userId: user.id }, { sessionToken: { startsWith: "test-" } }] } });

  // Visitante monta um carrinho
  const convidado = await db.cart.create({
    data: {
      sessionToken: "test-token-1",
      items: { create: [{ variantId: v1.id, quantity: 2 }, { variantId: v2.id, quantity: 1 }] },
    },
  });
  // Usuário já tinha outro carrinho, com um item em comum
  await db.cart.create({
    data: {
      userId: user.id,
      items: { create: [{ variantId: v1.id, quantity: 3 }, { variantId: v3.id, quantity: 1 }] },
    },
  });

  await mergeGuestCart(user.id, "test-token-1");

  const final = await db.cart.findUnique({ where: { userId: user.id }, include: { items: true } });
  check("carrinho do visitante é apagado após o merge",
    (await db.cart.findUnique({ where: { id: convidado.id } })) === null);
  check("itens de ambos os carrinhos sobrevivem", final!.items.length === 3, `${final!.items.length} itens`);
  check("quantidades do item em comum são somadas",
    final!.items.find((i) => i.variantId === v1.id)?.quantity === 5, "3 + 2 = 5");
  check("item só do visitante é trazido",
    final!.items.find((i) => i.variantId === v2.id)?.quantity === 1);
  check("item só do usuário permanece",
    final!.items.find((i) => i.variantId === v3.id)?.quantity === 1);

  console.log("\n── Merge não passa do estoque ──");
  await db.cart.deleteMany({ where: { OR: [{ userId: user.id }, { sessionToken: { startsWith: "test-" } }] } });
  // O teste cria a própria condição em vez de depender de o seed ter um item
  // com estoque baixo — o catálogo pode mudar.
  const limitada = await db.productVariant.findFirstOrThrow({ where: { isActive: true } });
  const estoqueOriginal = limitada.stock;
  const ESCASSO = 4;
  await db.productVariant.update({ where: { id: limitada.id }, data: { stock: ESCASSO } });

  await db.cart.create({
    data: { sessionToken: "test-token-2", items: { create: [{ variantId: limitada.id, quantity: ESCASSO }] } },
  });
  await db.cart.create({
    data: { userId: user.id, items: { create: [{ variantId: limitada.id, quantity: ESCASSO }] } },
  });
  await mergeGuestCart(user.id, "test-token-2");
  const limitado = await db.cart.findUnique({ where: { userId: user.id }, include: { items: true } });
  check("soma é limitada ao estoque disponível",
    limitado!.items[0].quantity === ESCASSO,
    `${ESCASSO} + ${ESCASSO} → ${limitado!.items[0].quantity} (estoque ${ESCASSO})`);
  await db.productVariant.update({ where: { id: limitada.id }, data: { stock: estoqueOriginal } });

  console.log("\n── Validação de cupom ──");
  const r1 = await validateCoupon("SUPZ10", 200);
  check("cupom válido aceito", r1.valid, `desconto R$ ${r1.discount}`);
  check("percentual calculado certo", r1.discount === 20, "10% de 200");
  const r2 = await validateCoupon("SUPZ10", 1000);
  check("teto de desconto respeitado", r2.discount === 50, `maxDiscount 50, calculado ${r2.discount}`);
  const r3 = await validateCoupon("BLACKWEEK", 200);
  check("cupom expirado recusado", !r3.valid, r3.reason);
  const r4 = await validateCoupon("INATIVO5", 200);
  check("cupom desativado recusado", !r4.valid, r4.reason);
  const r5 = await validateCoupon("NAOEXISTE", 200);
  check("cupom inexistente recusado", !r5.valid, r5.reason);
  const r6 = await validateCoupon("FRETEGRATIS", 100);
  check("valor mínimo respeitado", !r6.valid, r6.reason);
  const r7 = await validateCoupon("FRETEGRATIS", 200);
  check("acima do mínimo é aceito", r7.valid && r7.discount === 15);
  const r8 = await validateCoupon("supz10", 200);
  check("código é case-insensitive", r8.valid);

  console.log("\n── Limite por usuário ──");
  const joao = await db.user.findUniqueOrThrow({ where: { email: "joao@email.com" } });
  const jaUsou = await validateCoupon("SUPZ10", 200, joao.id);
  check("quem já usou o cupom é bloqueado", !jaUsou.valid, jaUsou.reason);
  const naoUsou = await validateCoupon("SUPZ10", 200, user.id);
  check("quem não usou continua podendo", naoUsou.valid);

  console.log("\n── Desconto nunca ultrapassa o subtotal ──");
  const gigante = computeDiscount(
    { discountType: DiscountType.FIXED, discountValue: 999, maxDiscount: null }, 50);
  check("desconto fixo maior que o carrinho é limitado", gigante === 50, `R$ ${gigante} de R$ 50`);

  await db.cart.deleteMany({ where: { OR: [{ userId: user.id }, { sessionToken: { startsWith: "test-" } }] } });
  console.log(`\n${falhas === 0 ? "Todos os testes passaram." : `${falhas} FALHA(S).`}\n`);
  process.exit(falhas === 0 ? 0 : 1);
}

main().finally(() => db.$disconnect());
