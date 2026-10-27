import "dotenv/config";
import { db } from "@/lib/db";
import {
  createProduct, updateProduct, createCategory, deleteCategory,
  adjustStock, addProductImage, setPrimaryImage, deleteProductImage,
} from "@/lib/services/products-admin";
import { createCoupon, deleteCoupon } from "@/lib/services/coupons-admin";
import { createBrand, updateBrand, deleteBrand } from "@/lib/services/products-admin";
import { setUserRole, setUserActive } from "@/lib/services/users-admin";
import { productSchema, categorySchema, brandSchema, couponSchema } from "@/lib/validations/admin";
import { ServiceError } from "@/lib/services/auth";
import { Role } from "@/prisma/generated/enums";

let falhas = 0;
function check(nome: string, ok: boolean, extra = "") {
  console.log(`${ok ? "  ok  " : "  FALHA"} ${nome}${extra ? ` — ${extra}` : ""}`);
  if (!ok) falhas++;
}
async function expectError(nome: string, fn: () => Promise<unknown>, trecho?: string) {
  try { await fn(); check(nome, false, "não lançou erro"); }
  catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const bate = !trecho || msg.toLowerCase().includes(trecho.toLowerCase());
    check(nome, e instanceof ServiceError && bate, msg);
  }
}

async function main() {
  const admin = await db.user.findUniqueOrThrow({ where: { email: "admin@supz.com.br" } });
  const categoria = await db.category.findFirstOrThrow();
  const marca = await db.brand.findFirstOrThrow();

  console.log("\n── Validação de produto ──");
  const base = {
    name: "Produto de Teste", slug: "produto-de-teste",
    description: "Descrição suficientemente longa para passar na validação.",
    categoryId: categoria.id, brandId: marca.id, price: "100.00",
    variants: [{ name: "Único", sku: "TESTE-0001", stock: "10", priceDelta: "0", lowStockThreshold: "3", isActive: true }],
  };
  check("slug com maiúscula é recusado",
    !productSchema.safeParse({ ...base, slug: "Produto-Teste" }).success);
  check("preço promocional maior que o de tabela é recusado",
    !productSchema.safeParse({ ...base, salePrice: "150" }).success);
  check("preço promocional menor é aceito",
    productSchema.safeParse({ ...base, salePrice: "80" }).success);
  check("variantes com nome repetido são recusadas",
    !productSchema.safeParse({ ...base, variants: [base.variants[0], { ...base.variants[0], sku: "TESTE-0002" }] }).success);
  check("produto sem variante é recusado",
    !productSchema.safeParse({ ...base, variants: [] }).success);

  console.log("\n── Cadastro de produto ──");
  await db.product.deleteMany({ where: { slug: "produto-de-teste" } });
  const parsed = productSchema.parse(base);
  const criado = await createProduct(parsed, admin.id);
  check("produto criado com variante", criado.variants.length === 1);
  const movimentacao = await db.stockMovement.findFirst({ where: { variantId: criado.variants[0].id } });
  check("estoque inicial vira movimentação INBOUND",
    movimentacao?.type === "INBOUND" && movimentacao.quantity === 10);
  await expectError("slug duplicado é recusado",
    () => createProduct(parsed, admin.id), "URL");
  await expectError("SKU duplicado é recusado",
    () => createProduct(productSchema.parse({ ...base, slug: "outro-slug" }), admin.id), "SKU");

  console.log("\n── Edição altera estoque com rastro ──");
  // A quantidade da movimentação é sempre positiva e o sinal vem do tipo, então
  // aumento e redução precisam gerar tipos diferentes — senão o saldo deixa de
  // fechar com o histórico.
  await updateProduct(criado.id, productSchema.parse({
    ...base,
    variants: [{ ...base.variants[0], id: criado.variants[0].id, stock: "25" }],
  }), admin.id);
  const entrada = await db.stockMovement.findFirst({
    where: { variantId: criado.variants[0].id, type: "INBOUND" },
    orderBy: { createdAt: "desc" },
  });
  check("aumento de estoque na edição gera INBOUND",
    entrada?.quantity === 15 && entrada.stockAfter === 25, entrada?.reason ?? undefined);

  await updateProduct(criado.id, productSchema.parse({
    ...base,
    variants: [{ ...base.variants[0], id: criado.variants[0].id, stock: "9" }],
  }), admin.id);
  const saida = await db.stockMovement.findFirst({
    where: { variantId: criado.variants[0].id, type: "ADJUSTMENT" },
    orderBy: { createdAt: "desc" },
  });
  check("redução de estoque na edição gera ADJUSTMENT",
    saida?.quantity === 16 && saida.stockAfter === 9, saida?.reason ?? undefined);

  // O saldo tem de fechar com o somatório assinado das movimentações.
  const movs = await db.stockMovement.findMany({ where: { variantId: criado.variants[0].id } });
  const somatorio = movs.reduce(
    (t, m) => t + (m.type === "INBOUND" || m.type === "CANCELLATION" ? m.quantity : -m.quantity), 0);
  const saldo = (await db.productVariant.findUniqueOrThrow({ where: { id: criado.variants[0].id } })).stock;
  check("saldo fecha com o histórico de movimentações", saldo === somatorio, `saldo ${saldo} = ${somatorio}`);
  await db.productVariant.update({ where: { id: criado.variants[0].id }, data: { stock: 25 } });

  console.log("\n── Variante vendida não é apagada ──");
  const variantesVendidas = await db.orderItem.findFirst({
    where: { variantId: { not: null } },
    select: { variantId: true, order: { select: { id: true } } },
  });
  const vendida = await db.productVariant.findUniqueOrThrow({
    where: { id: variantesVendidas!.variantId! },
    include: { product: { include: { variants: true } } },
  });
  const outrasDoMesmo = vendida.product.variants.filter((v) => v.id !== vendida.id);
  if (outrasDoMesmo.length > 0) {
    const semAVendida = productSchema.parse({
      name: vendida.product.name, slug: vendida.product.slug,
      description: vendida.product.description,
      categoryId: vendida.product.categoryId, brandId: vendida.product.brandId,
      price: String(vendida.product.price),
      variants: outrasDoMesmo.map((v) => ({
        id: v.id, name: v.name, sku: v.sku, stock: String(v.stock),
        priceDelta: String(v.priceDelta), lowStockThreshold: String(v.lowStockThreshold),
        isActive: v.isActive,
      })),
    });
    await updateProduct(vendida.productId, semAVendida, admin.id);
    const aindaExiste = await db.productVariant.findUnique({ where: { id: vendida.id } });
    check("variante com pedidos é desativada em vez de apagada",
      aindaExiste !== null && aindaExiste.isActive === false);
    await db.productVariant.update({ where: { id: vendida.id }, data: { isActive: true } });
  } else {
    check("variante com pedidos é desativada em vez de apagada", true, "produto sem outra variante — pulado");
  }

  console.log("\n── Imagem principal única ──");
  await addProductImage(criado.id, "/seed/produto-creatina.jpg", "a");
  await addProductImage(criado.id, "/seed/produto-bcaa.jpg", "b");
  const imgs = await db.productImage.findMany({ where: { productId: criado.id } });
  check("primeira imagem vira a principal", imgs.filter((i) => i.isPrimary).length === 1);
  const segunda = imgs.find((i) => !i.isPrimary)!;
  await setPrimaryImage(criado.id, segunda.id);
  const depois = await db.productImage.findMany({ where: { productId: criado.id } });
  check("trocar a principal mantém exatamente uma",
    depois.filter((i) => i.isPrimary).length === 1 &&
    depois.find((i) => i.isPrimary)!.id === segunda.id);
  await deleteProductImage(segunda.id);
  const restantes = await db.productImage.findMany({ where: { productId: criado.id } });
  check("apagar a principal promove a próxima",
    restantes.length === 1 && restantes[0].isPrimary);

  console.log("\n── Ajuste de estoque ──");
  const vId = criado.variants[0].id;
  await adjustStock({ variantId: vId, delta: 10, reason: "Reposição" }, admin.id);
  check("entrada soma ao saldo",
    (await db.productVariant.findUniqueOrThrow({ where: { id: vId } })).stock === 35);
  await adjustStock({ variantId: vId, delta: -5, reason: "Perda" }, admin.id);
  check("saída subtrai do saldo",
    (await db.productVariant.findUniqueOrThrow({ where: { id: vId } })).stock === 30);
  await expectError("saída maior que o saldo é recusada",
    () => adjustStock({ variantId: vId, delta: -999, reason: "Erro" }, admin.id), "negativo");

  console.log("\n── Categorias ──");
  const cat = await createCategory(categorySchema.parse({ name: "Cat Teste", slug: "cat-teste", sortOrder: "9" }));
  await expectError("categoria duplicada é recusada",
    () => createCategory(categorySchema.parse({ name: "Cat Teste", slug: "cat-teste-2", sortOrder: "0" })));
  await db.product.update({ where: { id: criado.id }, data: { categoryId: cat.id } });
  await expectError("categoria com produtos não é excluída",
    () => deleteCategory(cat.id), "produto");
  await db.product.update({ where: { id: criado.id }, data: { categoryId: categoria.id } });
  await deleteCategory(cat.id);
  check("categoria vazia é excluída",
    (await db.category.findUnique({ where: { id: cat.id } })) === null);

  console.log("\n── Marcas ──");
  check("slug com espaço é recusado",
    !brandSchema.safeParse({ name: "Marca X", slug: "marca x", isActive: true }).success);
  await db.brand.deleteMany({ where: { slug: { in: ["marca-teste", "marca-teste-2"] } } });
  const novaMarca = await createBrand(brandSchema.parse({ name: "Marca Teste", slug: "marca-teste", isActive: true }));
  check("marca criada", novaMarca.name === "Marca Teste");
  await expectError("marca duplicada é recusada",
    () => createBrand(brandSchema.parse({ name: "Marca Teste", slug: "marca-teste-2", isActive: true })), "já existe");
  await updateBrand(novaMarca.id, brandSchema.parse({ name: "Marca Teste 2", slug: "marca-teste-2", isActive: false }));
  const renomeada = await db.brand.findUniqueOrThrow({ where: { id: novaMarca.id } });
  check("marca editada e desativada", renomeada.name === "Marca Teste 2" && !renomeada.isActive);
  const marcaComProdutos = await db.brand.findFirstOrThrow({ where: { products: { some: {} } } });
  await expectError("marca com produtos não é excluída",
    () => deleteBrand(marcaComProdutos.id), "produto");
  await deleteBrand(novaMarca.id);
  check("marca sem produtos é excluída",
    (await db.brand.findUnique({ where: { id: novaMarca.id } })) === null);

  console.log("\n── Cupons ──");
  check("percentual acima de 100 é recusado no schema",
    !couponSchema.safeParse({ code: "TESTE", discountType: "PERCENTAGE", discountValue: "150", isActive: true }).success);
  check("código com espaço é recusado",
    !couponSchema.safeParse({ code: "TES TE", discountType: "FIXED", discountValue: "10", isActive: true }).success);
  const cup = await createCoupon(couponSchema.parse({
    code: "TESTE99", discountType: "PERCENTAGE", discountValue: "15", isActive: true,
  }));
  await expectError("código duplicado é recusado",
    () => createCoupon(couponSchema.parse({ code: "teste99", discountType: "FIXED", discountValue: "5", isActive: true })), "já existe");
  await deleteCoupon(cup.id);
  check("cupom sem uso é excluído", (await db.coupon.findUnique({ where: { id: cup.id } })) === null);
  const usado = await db.coupon.findFirstOrThrow({ where: { redemptions: { some: {} } } });
  await expectError("cupom já usado não é excluído", () => deleteCoupon(usado.id), "Desative");

  console.log("\n── Proteções de usuário ──");
  await expectError("admin não pode desativar a própria conta",
    () => setUserActive(admin.id, false, admin.id), "própria conta");
  await expectError("admin não pode rebaixar a si mesmo",
    () => setUserRole(admin.id, Role.CUSTOMER, admin.id), "próprio acesso");
  const cliente = await db.user.findFirstOrThrow({ where: { role: Role.CUSTOMER } });
  await setUserRole(cliente.id, Role.ADMIN, admin.id);
  check("cliente pode ser promovido",
    (await db.user.findUniqueOrThrow({ where: { id: cliente.id } })).role === "ADMIN");
  await setUserRole(cliente.id, Role.CUSTOMER, admin.id);
  // Com só um admin restante, rebaixá-lo tem de ser barrado.
  await db.user.update({ where: { id: admin.id }, data: { role: Role.CUSTOMER } });
  await db.user.update({ where: { id: cliente.id }, data: { role: Role.ADMIN } });
  await expectError("não é possível ficar sem nenhum administrador",
    () => setUserRole(cliente.id, Role.CUSTOMER, "outro-id"), "ao menos um administrador");
  await db.user.update({ where: { id: admin.id }, data: { role: Role.ADMIN } });
  await db.user.update({ where: { id: cliente.id }, data: { role: Role.CUSTOMER } });

  await db.product.deleteMany({ where: { slug: "produto-de-teste" } });
  console.log(`\n${falhas === 0 ? "Todos os testes passaram." : `${falhas} FALHA(S).`}\n`);
  process.exit(falhas === 0 ? 0 : 1);
}

main().finally(() => db.$disconnect());
