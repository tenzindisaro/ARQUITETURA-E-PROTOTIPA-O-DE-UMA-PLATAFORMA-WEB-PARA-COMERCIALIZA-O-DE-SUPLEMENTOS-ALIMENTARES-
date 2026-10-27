// Frete é constante neste projeto — sem tabela e sem integração com transportadora.
// Ver docs/PLANO.md §3.4.

export const FREE_SHIPPING_THRESHOLD = 299;

export const SHIPPING_METHODS = [
  { id: "standard", label: "Padrão", price: 15.0, etaDays: "5 a 8 dias úteis" },
  { id: "express", label: "Expressa", price: 29.9, etaDays: "1 a 2 dias úteis" },
] as const;

export type ShippingMethodId = (typeof SHIPPING_METHODS)[number]["id"];

export function shippingCost(methodId: ShippingMethodId, subtotal: number): number {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  const method = SHIPPING_METHODS.find((m) => m.id === methodId);
  return method ? method.price : 0;
}
