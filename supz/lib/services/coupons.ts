import "server-only";
import { db } from "@/lib/db";
import { DiscountType } from "@/prisma/generated/enums";
import { toCents, fromCents } from "@/lib/pricing";

export interface CouponValidation {
  valid: boolean;
  reason?: string;
  coupon?: { id: string; code: string; description: string | null };
  /** Desconto em reais, já limitado pelo teto e pelo subtotal. */
  discount: number;
}

/**
 * Ordem de validação, conforme docs/PLANO.md §3.4: existe → ativo → já começou
 * → não expirou → limite global → limite por usuário → valor mínimo.
 */
export async function validateCoupon(
  code: string,
  subtotal: number,
  userId?: string,
): Promise<CouponValidation> {
  const normalizado = code.trim().toUpperCase();
  if (!normalizado) return { valid: false, reason: "Informe um cupom.", discount: 0 };

  const cupom = await db.coupon.findUnique({ where: { code: normalizado } });
  if (!cupom) return { valid: false, reason: "Cupom não encontrado.", discount: 0 };

  const agora = new Date();
  if (!cupom.isActive) {
    return { valid: false, reason: "Este cupom não está mais ativo.", discount: 0 };
  }
  if (cupom.startsAt > agora) {
    return { valid: false, reason: "Este cupom ainda não está valendo.", discount: 0 };
  }
  if (cupom.expiresAt && cupom.expiresAt < agora) {
    return { valid: false, reason: "Este cupom expirou.", discount: 0 };
  }
  if (cupom.usageLimit !== null && cupom.usedCount >= cupom.usageLimit) {
    return { valid: false, reason: "Este cupom atingiu o limite de utilizações.", discount: 0 };
  }
  if (userId && cupom.usageLimitPerUser !== null) {
    const usos = await db.couponRedemption.count({
      where: { couponId: cupom.id, userId },
    });
    if (usos >= cupom.usageLimitPerUser) {
      return { valid: false, reason: "Você já utilizou este cupom.", discount: 0 };
    }
  }
  if (cupom.minOrderTotal && subtotal < Number(cupom.minOrderTotal)) {
    return {
      valid: false,
      reason: `Este cupom vale para pedidos a partir de R$ ${Number(cupom.minOrderTotal).toFixed(2).replace(".", ",")}.`,
      discount: 0,
    };
  }

  return {
    valid: true,
    coupon: { id: cupom.id, code: cupom.code, description: cupom.description },
    discount: computeDiscount(cupom, subtotal),
  };
}

type DiscountRule = {
  discountType: DiscountType;
  discountValue: unknown;
  maxDiscount: unknown | null;
};

/** Desconto nunca ultrapassa o teto do cupom nem o próprio subtotal. */
export function computeDiscount(cupom: DiscountRule, subtotal: number): number {
  const subtotalCents = toCents(subtotal);
  let cents: number;

  if (cupom.discountType === DiscountType.PERCENTAGE) {
    cents = Math.round((subtotalCents * Number(cupom.discountValue as string)) / 100);
  } else {
    cents = toCents(cupom.discountValue as string);
  }

  if (cupom.maxDiscount !== null && cupom.maxDiscount !== undefined) {
    cents = Math.min(cents, toCents(cupom.maxDiscount as string));
  }

  return fromCents(Math.min(cents, subtotalCents));
}

export async function listCoupons() {
  return db.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { redemptions: true } } },
  });
}
