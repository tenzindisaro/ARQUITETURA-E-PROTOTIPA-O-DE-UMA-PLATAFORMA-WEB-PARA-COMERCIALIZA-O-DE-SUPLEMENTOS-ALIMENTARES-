const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatPrice(value: number | string): string {
  return BRL.format(Number(value));
}

/// Número do pedido como aparece para o cliente: #000123
export function formatOrderNumber(n: number): string {
  return `#${String(n).padStart(6, "0")}`;
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Pluraliza um substantivo em português trocando a terminação inteira, não
 * concatenando sufixo: "avaliação" + "ões" viraria "avaliaçãoões".
 */
export function plural(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
