import { isSortKey } from "@/lib/catalog-sort";
import type { CatalogFilters } from "@/lib/services/catalog";

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function toNumber(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Traduz a querystring da vitrine para os filtros do serviço de catálogo. */
export function parseCatalogParams(raw: RawParams): CatalogFilters {
  const ordem = first(raw.ordem);
  const pagina = Number(first(raw.pagina) ?? 1);

  return {
    q: first(raw.q)?.trim() || undefined,
    categorySlug: first(raw.categoria) || undefined,
    brandSlug: first(raw.marca) || undefined,
    minPrice: toNumber(first(raw.precoMin)),
    maxPrice: toNumber(first(raw.precoMax)),
    minRating: toNumber(first(raw.nota)),
    sort: isSortKey(ordem) ? ordem : undefined,
    page: Number.isFinite(pagina) && pagina > 0 ? pagina : 1,
  };
}

/** Reconstrói a URL preservando os filtros, trocando só a página. */
export function buildPageHref(basePath: string, raw: RawParams, page: number) {
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries(raw)) {
    const v = first(valor);
    if (v && chave !== "pagina" && chave !== "slug") params.set(chave, v);
  }
  if (page > 1) params.set("pagina", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
