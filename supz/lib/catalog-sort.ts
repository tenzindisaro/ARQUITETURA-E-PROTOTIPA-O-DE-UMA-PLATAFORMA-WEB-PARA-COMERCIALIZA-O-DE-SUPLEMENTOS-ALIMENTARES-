/**
 * Opções de ordenação do catálogo. Vive fora de `lib/services/catalog.ts` de
 * propósito: os filtros são um Client Component, e importar do serviço puxaria
 * Prisma e o driver `pg` para dentro do bundle do navegador.
 */
export const SORT_OPTIONS = {
  relevancia: "Mais relevantes",
  "menor-preco": "Menor preço",
  "maior-preco": "Maior preço",
  avaliacao: "Melhores avaliações",
  recentes: "Mais recentes",
  "mais-vendidos": "Mais vendidos",
} as const;

export type SortKey = keyof typeof SORT_OPTIONS;

export function isSortKey(value: unknown): value is SortKey {
  return typeof value === "string" && value in SORT_OPTIONS;
}
