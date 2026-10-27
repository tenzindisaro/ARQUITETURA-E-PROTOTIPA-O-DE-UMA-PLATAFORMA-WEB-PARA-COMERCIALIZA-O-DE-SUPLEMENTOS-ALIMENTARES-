import "dotenv/config";
import { db } from "@/lib/db";
import { listProducts, getActiveFlashSale, getProductBySlug } from "@/lib/services/catalog";
import { resolvePrice } from "@/lib/pricing";

let falhas = 0;
function check(nome: string, ok: boolean, extra = "") {
  console.log(`${ok ? "  ok  " : "  FALHA"} ${nome}${extra ? ` — ${extra}` : ""}`);
  if (!ok) falhas++;
}

async function main() {
  console.log("\n── Busca ──");
  const porNome = await listProducts({ q: "whey" });
  check("busca por nome encontra", porNome.total >= 2, `${porNome.total} resultados`);
  const porMarca = await listProducts({ q: "VittaForge" });
  check("busca por marca encontra", porMarca.total >= 1, `${porMarca.total} resultados`);
  const porCategoria = await listProducts({ q: "Aminoácidos" });
  check("busca por categoria encontra", porCategoria.total >= 2, `${porCategoria.total} resultados`);
  const vazio = await listProducts({ q: "xyzabc123" });
  check("busca sem resultado devolve vazio", vazio.total === 0 && vazio.products.length === 0);

  console.log("\n── Filtros ──");
  const cat = await listProducts({ categorySlug: "proteinas" });
  check("filtro por categoria",
    cat.total > 0 && cat.products.every((p) => p.categorySlug === "proteinas"), `${cat.total} produtos`);
  const marca = await listProducts({ brandSlug: "orvix" });
  check("filtro por marca", marca.total > 0 && marca.products.every((p) => p.brandName === "Orvix"), `${marca.total} produtos`);
  const nota = await listProducts({ minRating: 4.5 });
  check("filtro por avaliação", nota.products.every((p) => p.ratingAverage >= 4.5), `${nota.total} produtos`);
  const faixa = await listProducts({ minPrice: 50, maxPrice: 80 });
  check("filtro por faixa de preço usa o preço efetivo",
    faixa.products.every((p) => p.currentPrice >= 50 && p.currentPrice <= 80),
    faixa.products.map((p) => p.currentPrice).join(", "));

  console.log("\n── Ordenação ──");
  const asc = await listProducts({ sort: "menor-preco", perPage: 50 });
  const precosAsc = asc.products.map((p) => p.currentPrice);
  check("menor preço ordena crescente pelo preço efetivo",
    precosAsc.every((v, i) => i === 0 || precosAsc[i - 1] <= v), precosAsc.slice(0, 5).join(" ≤ "));
  const desc = await listProducts({ sort: "maior-preco", perPage: 50 });
  const precosDesc = desc.products.map((p) => p.currentPrice);
  check("maior preço ordena decrescente",
    precosDesc.every((v, i) => i === 0 || precosDesc[i - 1] >= v), precosDesc.slice(0, 5).join(" ≥ "));
  const aval = await listProducts({ sort: "avaliacao", perPage: 50 });
  const notas = aval.products.map((p) => p.ratingAverage);
  check("avaliação ordena decrescente", notas.every((v, i) => i === 0 || notas[i - 1] >= v));

  console.log("\n── Paginação ──");
  const p1 = await listProducts({ perPage: 4, page: 1, sort: "recentes" });
  const p2 = await listProducts({ perPage: 4, page: 2, sort: "recentes" });
  check("página 1 tem 4 itens", p1.products.length === 4);
  check("páginas não se repetem",
    !p1.products.some((a) => p2.products.some((b) => b.id === a.id)));
  check("total de páginas coerente", p1.totalPages === Math.ceil(p1.total / 4), `${p1.total} produtos / ${p1.totalPages} páginas`);

  console.log("\n── Precedência de preço (SQL x TypeScript) ──");
  const flash = await getActiveFlashSale();
  check("promoção relâmpago ativa encontrada", flash !== null);
  if (flash) {
    for (const p of flash.products) {
      const esperado = p.flash!.promoPrice + Math.min(...p.variants.map((v) => v.priceDelta));
      check(`  ${p.name.slice(0, 32)} usa preço de flash`,
        p.isFlash && Math.abs(p.currentPrice - esperado) < 0.001,
        `R$ ${p.currentPrice}`);
    }
    // O mesmo produto, buscado pelo catálogo, tem de dar o mesmo preço.
    const doCatalogo = await listProducts({ q: flash.products[0].name, perPage: 1 });
    check("catálogo e flash concordam no preço",
      doCatalogo.products[0]?.currentPrice === flash.products[0].currentPrice,
      `catálogo ${doCatalogo.products[0]?.currentPrice} vs flash ${flash.products[0].currentPrice}`);
  }

  const preTreino = await getProductBySlug("pre-treino-ignite-citrus-300g");
  if (preTreino) {
    const semSabor = resolvePrice({
      price: preTreino.price, salePrice: preTreino.salePrice,
      flashPrice: preTreino.flashPromoPrice, priceDelta: 0,
    });
    check("flash vence preço promocional", semSabor.currentPrice === preTreino.flashPromoPrice,
      `tabela ${preTreino.price} / promo ${preTreino.salePrice} / flash ${preTreino.flashPromoPrice} → ${semSabor.currentPrice}`);
    check("desconto calculado sobre o preço de tabela", semSabor.discountPercent === Math.round((preTreino.price - preTreino.flashPromoPrice!) / preTreino.price * 100),
      `${semSabor.discountPercent}%`);
  }

  console.log("\n── Produto inativo não aparece ──");
  const alvo = await db.product.findFirst({ where: { isActive: true }, select: { id: true, slug: true, name: true } });
  await db.product.update({ where: { id: alvo!.id }, data: { isActive: false } });
  const oculto = await listProducts({ q: alvo!.name, perPage: 50 });
  check("produto desativado some do catálogo", !oculto.products.some((p) => p.id === alvo!.id));
  check("produto desativado não abre pela URL", (await getProductBySlug(alvo!.slug)) === null);
  await db.product.update({ where: { id: alvo!.id }, data: { isActive: true } });

  console.log(`\n${falhas === 0 ? "Todos os testes passaram." : `${falhas} FALHA(S).`}\n`);
  process.exit(falhas === 0 ? 0 : 1);
}

main().finally(() => db.$disconnect());
