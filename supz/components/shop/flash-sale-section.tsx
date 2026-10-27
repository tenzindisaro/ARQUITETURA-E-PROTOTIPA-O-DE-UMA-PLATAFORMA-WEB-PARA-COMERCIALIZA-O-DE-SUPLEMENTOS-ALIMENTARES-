import Image from "next/image";
import Link from "next/link";
import { Flame } from "lucide-react";
import { getActiveFlashSale } from "@/lib/services/catalog";
import { formatPrice } from "@/lib/format";
import { FlashSaleCountdown } from "@/components/shop/flash-sale-countdown";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { Progress } from "@/components/ui/progress";

export async function FlashSaleSection() {
  const sale = await getActiveFlashSale();
  if (!sale || sale.products.length === 0) return null;

  return (
    <section className="bg-gradient-to-r from-ink to-surface-dark py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-accent">
              <Flame className="size-5 text-accent-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Flash Sale</h2>
              <p className="text-sm text-white/50">Ofertas relâmpago por tempo limitado</p>
            </div>
          </div>
          <FlashSaleCountdown endsAt={sale.endsAt.toISOString()} />
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {sale.products.slice(0, 4).map((p) => {
            const limite = p.flash?.stockLimit ?? null;
            const vendidos = p.flash?.soldCount ?? 0;
            const restantes = limite === null ? null : Math.max(0, limite - vendidos);
            const progresso = limite ? Math.min(100, (vendidos / limite) * 100) : 0;

            return (
              <div
                key={p.id}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-all hover:border-accent/40"
              >
                <Link href={`/produtos/${p.slug}`} className="relative block aspect-square bg-white/5">
                  {p.imageUrl && (
                    <Image
                      src={p.imageUrl}
                      alt={p.imageAlt}
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <span className="absolute bottom-2 left-2 rounded-lg bg-destructive px-2.5 py-1 text-xs font-bold text-destructive-foreground">
                    -{p.discountPercent}% OFF
                  </span>
                </Link>

                <div className="space-y-2 p-3">
                  <Link
                    href={`/produtos/${p.slug}`}
                    className="line-clamp-2 text-sm font-semibold leading-tight text-white hover:text-accent"
                  >
                    {p.name}
                  </Link>
                  <div>
                    <p className="text-xs text-white/40 line-through">
                      {formatPrice(p.listPrice)}
                    </p>
                    <p className="text-lg font-black text-accent">
                      {formatPrice(p.currentPrice)}
                    </p>
                  </div>

                  {limite !== null && (
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-white/40">
                        <span>{restantes === 0 ? "Esgotado" : "Restam poucos"}</span>
                        <span>{restantes} unidades</span>
                      </div>
                      <Progress value={progresso} className="h-1.5 bg-white/10" />
                    </div>
                  )}

                  <AddToCartButton variants={p.variants} productName={p.name} size="sm" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
