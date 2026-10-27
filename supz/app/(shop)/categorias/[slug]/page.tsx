import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Package } from "lucide-react";
import {
  listProducts, getCategories, getBrands, getPriceRange, getCategoryBySlug,
} from "@/lib/services/catalog";
import { parseCatalogParams, buildPageHref } from "@/lib/catalog-params";
import { ProductCard } from "@/components/shop/product-card";
import { CatalogFilters, SortSelect } from "@/components/shop/catalog-filters";
import { CatalogPagination } from "@/components/shop/catalog-pagination";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/categorias/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const categoria = await getCategoryBySlug(slug);
  if (!categoria) return { title: "Categoria não encontrada" };

  return {
    title: categoria.name,
    description: categoria.description ?? `Suplementos da categoria ${categoria.name} na SUPZ.`,
  };
}

export default async function Page(props: PageProps<"/categorias/[slug]">) {
  const { slug } = await props.params;
  const raw = await props.searchParams;

  const categoria = await getCategoryBySlug(slug);
  if (!categoria) notFound();

  const filtros = { ...parseCatalogParams(raw), categorySlug: slug };

  const [resultado, categorias, marcas, faixa] = await Promise.all([
    listProducts(filtros),
    getCategories(),
    getBrands(),
    getPriceRange(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-black tracking-tight">{categoria.name}</h1>
        {categoria.description && (
          <p className="mt-1 max-w-2xl text-muted-foreground">{categoria.description}</p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          {resultado.total} produto{resultado.total === 1 ? "" : "s"}
        </p>
      </header>

      <div className="flex gap-8">
        <CatalogFilters categories={categorias} brands={marcas} priceRange={faixa} hideCategory variant="sidebar" />

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex items-center justify-between gap-3">
            <CatalogFilters
              categories={categorias} brands={marcas} priceRange={faixa} hideCategory
              variant="sheet"
            />
            <div className="ml-auto"><SortSelect /></div>
          </div>

          {resultado.products.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-20 text-center">
              <Package className="mx-auto mb-3 size-12 text-muted-foreground/30" />
              <p className="font-semibold">Nenhum produto nesta categoria</p>
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
            buildHref={(p) => buildPageHref(`/categorias/${slug}`, raw, p)}
          />
        </div>
      </div>
    </div>
  );
}
