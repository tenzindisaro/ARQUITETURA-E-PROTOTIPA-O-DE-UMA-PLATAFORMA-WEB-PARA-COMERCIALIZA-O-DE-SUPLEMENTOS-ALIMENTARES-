import "server-only";
import { db } from "@/lib/db";
import { DiscountType } from "@/prisma/generated/enums";
import { ServiceError } from "@/lib/services/auth";
import type { CouponInput } from "@/lib/validations/admin";

function toData(input: CouponInput) {
  return {
    code: input.code.toUpperCase(),
    description: input.description || null,
    discountType: DiscountType[input.discountType],
    discountValue: input.discountValue,
    minOrderTotal: input.minOrderTotal ?? null,
    maxDiscount: input.maxDiscount ?? null,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    usageLimit: input.usageLimit ?? null,
    usageLimitPerUser: input.usageLimitPerUser ?? null,
    isActive: input.isActive,
  };
}

export async function createCoupon(input: CouponInput) {
  const emUso = await db.coupon.findUnique({ where: { code: input.code.toUpperCase() } });
  if (emUso) throw new ServiceError("Já existe um cupom com este código.", "code");

  return db.coupon.create({ data: toData(input) });
}

export async function updateCoupon(id: string, input: CouponInput) {
  const emUso = await db.coupon.findFirst({
    where: { code: input.code.toUpperCase(), id: { not: id } },
  });
  if (emUso) throw new ServiceError("Já existe um cupom com este código.", "code");

  return db.coupon.update({ where: { id }, data: toData(input) });
}

export async function setCouponActive(id: string, isActive: boolean) {
  await db.coupon.update({ where: { id }, data: { isActive } });
}

export async function deleteCoupon(id: string) {
  const usos = await db.couponRedemption.count({ where: { couponId: id } });
  if (usos > 0) {
    throw new ServiceError(
      `Este cupom já foi usado em ${usos} pedido(s). Desative-o em vez de excluir.`,
    );
  }
  await db.coupon.delete({ where: { id } });
}

export async function getCoupon(id: string) {
  return db.coupon.findUnique({ where: { id } });
}

export async function listAdminOrders(status?: string, q?: string) {
  return db.order.findMany({
    where: {
      ...(status && status !== "todos"
        ? { status: status as never }
        : {}),
      ...(q
        ? {
            OR: [
              { user: { name: { contains: q, mode: "insensitive" as const } } },
              { user: { email: { contains: q, mode: "insensitive" as const } } },
              ...(Number.isInteger(Number(q)) ? [{ number: Number(q) }] : []),
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
      payment: { select: { status: true, method: true } },
      _count: { select: { items: true } },
    },
  });
}
