import type { Metadata } from "next";
import { getCouponUsage } from "@/lib/services/admin-reports";
import { CouponManager } from "@/components/admin/coupon-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cupons" };

export default async function Page() {
  const cupons = await getCouponUsage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Cupons</h1>
        <p className="text-muted-foreground">
          Cupons são validados no carrinho e de novo no fechamento do pedido.
        </p>
      </div>

      <CouponManager
        coupons={cupons.map((c) => ({
          id: c.id,
          code: c.code,
          description: c.description,
          discountType: c.discountType,
          discountValue: Number(c.discountValue),
          minOrderTotal: c.minOrderTotal === null ? null : Number(c.minOrderTotal),
          maxDiscount: c.maxDiscount === null ? null : Number(c.maxDiscount),
          expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
          usageLimit: c.usageLimit,
          usageLimitPerUser: c.usageLimitPerUser,
          usedCount: c.usedCount,
          isActive: c.isActive,
          totalDescontado: c.redemptions.reduce((s, r) => s + Number(r.amount), 0),
        }))}
      />
    </div>
  );
}
