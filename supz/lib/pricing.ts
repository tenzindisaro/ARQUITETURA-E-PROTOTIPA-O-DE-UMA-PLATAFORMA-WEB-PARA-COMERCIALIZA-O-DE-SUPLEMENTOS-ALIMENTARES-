// Única fonte de verdade de preço. Vitrine, carrinho, checkout e criação de
// pedido passam por aqui — nunca recalculam por conta própria.
// Ver docs/PLANO.md §3.4.

type Money = number | string | { toString(): string };

/** Converte qualquer representação de dinheiro para centavos (inteiro). */
export function toCents(value: Money | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Math.round(Number(value.toString()) * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export interface PriceInput {
  /** Preço de tabela do produto. */
  price: Money;
  /** Preço promocional fixo do produto, se houver. */
  salePrice?: Money | null;
  /** Ajuste da variante escolhida (sabor premium, tamanho maior). */
  priceDelta?: Money | null;
  /** Preço da promoção relâmpago, apenas se a janela estiver aberta. */
  flashPrice?: Money | null;
}

export interface ResolvedPrice {
  /** Preço "de", riscado na interface. */
  listPrice: number;
  /** Preço "por", efetivamente cobrado. */
  currentPrice: number;
  /** Desconto em pontos percentuais, arredondado. 0 quando não há desconto. */
  discountPercent: number;
  hasDiscount: boolean;
  /** Verdadeiro quando o preço atual vem de uma promoção relâmpago. */
  isFlash: boolean;
}

/**
 * Precedência: promoção relâmpago > preço promocional > preço de tabela.
 * O ajuste da variante é somado depois, em qualquer um dos casos.
 *
 * A promoção relâmpago expira sozinha: fora da janela, quem consulta não traz
 * `flashPrice` e o preço volta ao normal, sem job agendado.
 */
export function resolvePrice(input: PriceInput): ResolvedPrice {
  const delta = toCents(input.priceDelta);
  const listPrice = toCents(input.price) + delta;

  let currentPrice = listPrice;
  let isFlash = false;

  if (input.flashPrice !== null && input.flashPrice !== undefined) {
    currentPrice = toCents(input.flashPrice) + delta;
    isFlash = true;
  } else if (input.salePrice !== null && input.salePrice !== undefined) {
    currentPrice = toCents(input.salePrice) + delta;
  }

  // Uma promoção nunca deve encarecer o produto.
  if (currentPrice > listPrice) currentPrice = listPrice;

  const hasDiscount = currentPrice < listPrice;

  return {
    listPrice: fromCents(listPrice),
    currentPrice: fromCents(currentPrice),
    discountPercent: hasDiscount
      ? Math.round(((listPrice - currentPrice) / listPrice) * 100)
      : 0,
    hasDiscount,
    isFlash,
  };
}

/**
 * Filtro Prisma para trazer somente itens de promoção relâmpago em vigor.
 * Usar em `include: { flashItems: { where: activeFlashSaleFilter() } }`.
 */
export function activeFlashSaleFilter(now: Date = new Date()) {
  return {
    flashSale: {
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
  };
}
