import type { Metadata } from "next";
import { Package } from "lucide-react";
import { listProducts, getCategories, getBrands, getPriceRange } from "@/lib/services/catalog";
import { parseCatalogParams, buildPageHref } from "@/lib/catalog-params";
import { ProductCard } from "@/components/shop/product-card";
import { CatalogFilters, SortSelect } from "@/components/shop/catalog-filters";
import { CatalogPagination } from "@/components/shop/catalog-pagination";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Todos os produtos",
  description:
    "Catálogo completo de suplementos SUPZ: proteínas, creatina, pré-treino, aminoácidos, vitaminas e mais.",
};

export default async function Page(props: PageProps<"/produtos">) {
  const raw = await props.searchParams;
  const filtros = parseCatalogParams(raw);

  const [resultado, categorias, marcas, faixa] = await Promise.all([
    listProducts(filtros),
    getCategories(),
    getBrands(),
    getPriceRange(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-black tracking-tight">
          {filtros.q ? `Resultados para “${filtros.q}”` : "Todos os produtos"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {resultado.total} produto{resultado.total === 1 ? "" : "s"} encontrado
          {resultado.total === 1 ? "" : "s"}
        </p>
      </header>

      <div className="flex gap-8">
        <CatalogFilters categories={categorias} brands={marcas} priceRange={faixa} variant="sidebar" />

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex items-center justify-between gap-3">
            <CatalogFilters
              categories={categorias} brands={marcas} priceRange={faixa} variant="sheet"
            />
            <div className="ml-auto">
              <SortSelect />
            </div>
          </div>

          {resultado.products.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-20 text-center">
              <Package className="mx-auto mb-3 size-12 text-muted-foreground/30" />
              <p className="font-semibold">Nenhum produto encontrado</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tente outros termos de busca ou remova alguns filtros.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-6">
              {resultado.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          <CatalogPagination
            page={resultado.page}
            totalPages={resultado.totalPages}
            buildHref={(p) => buildPageHref("/produtos", raw, p)}
          />
        </div>
      </div>
    </div>
  );
}
