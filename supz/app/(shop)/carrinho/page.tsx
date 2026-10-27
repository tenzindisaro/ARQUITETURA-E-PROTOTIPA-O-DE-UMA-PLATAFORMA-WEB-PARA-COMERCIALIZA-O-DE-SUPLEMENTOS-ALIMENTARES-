import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart, ArrowRight, TriangleAlert, Truck } from "lucide-react";
import { getCartSummary } from "@/lib/services/cart";
import { formatPrice } from "@/lib/format";
import { CartLineItem } from "@/components/shop/cart-line-item";
import { CouponForm } from "@/components/shop/coupon-form";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Carrinho" };

export default async function Page() {
  const cart = await getCartSummary();

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-secondary">
          <ShoppingCart className="size-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-black">Seu carrinho está vazio</h1>
        <p className="mt-2 text-muted-foreground">
          Adicione produtos para continuar com a compra.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/produtos">Continuar comprando</Link>
        </Button>
      </div>
    );
  }

  const progressoFrete = Math.min(
    100,
    (cart.subtotal / cart.freeShippingThreshold) * 100,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-3xl font-black tracking-tight">
        Carrinho{" "}
        <span className="text-lg font-medium text-muted-foreground">
          ({cart.itemCount} {cart.itemCount === 1 ? "item" : "itens"})
        </span>
      </h1>

      {cart.couponWarning && (
        <Alert variant="destructive" className="mb-6">
          <TriangleAlert />
          <AlertDescription>
            {cart.couponWarning} O cupom foi removido do carrinho.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          {cart.missingForFreeShipping > 0 ? (
            <div className="mb-5 rounded-2xl border bg-card p-4">
              <p className="flex items-center gap-2 text-sm">
                <Truck className="size-4 text-primary" />
                Faltam{" "}
                <strong>{formatPrice(cart.missingForFreeShipping)}</strong> para
                o frete grátis
              </p>
              <Progress value={progressoFrete} className="mt-2 h-2" />
            </div>
          ) : (
            <div className="mb-5 rounded-2xl bg-success/10 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-success">
                <Truck className="size-4" /> Você ganhou frete grátis!
              </p>
            </div>
          )}

          <ul className="divide-y rounded-2xl border bg-card px-5">
            {cart.lines.map((line) => (
              <CartLineItem key={line.itemId} line={line} />
            ))}
          </ul>

          <Button asChild variant="ghost" className="mt-4">
            <Link href="/produtos">← Continuar comprando</Link>
          </Button>
        </div>

        <aside className="lg:sticky lg:top-36 lg:h-fit">
          <div className="space-y-5 rounded-2xl border bg-card p-6">
            <h2 className="text-lg font-bold">Resumo do pedido</h2>

            <CouponForm applied={cart.coupon} />

            <Separator />

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium">{formatPrice(cart.subtotal)}</dd>
              </div>
              {cart.discount > 0 && (
                <div className="flex justify-between text-success">
                  <dt>Desconto ({cart.coupon?.code})</dt>
                  <dd className="font-medium">−{formatPrice(cart.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Frete</dt>
                <dd className="font-medium">
                  {cart.shipping === 0 ? (
                    <span className="text-success">Grátis</span>
                  ) : (
                    formatPrice(cart.shipping)
                  )}
                </dd>
              </div>
            </dl>

            <Separator />

            <div className="flex items-baseline justify-between">
              <span className="font-bold">Total</span>
              <span className="text-2xl font-black text-primary">
                {formatPrice(cart.total)}
              </span>
            </div>
            <p className="-mt-3 text-right text-xs text-success">
              ou 12x de {formatPrice(cart.total / 12)} sem juros
            </p>

            {cart.hasStockIssue ? (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertDescription>
                  Ajuste as quantidades acima do estoque para continuar.
                </AlertDescription>
              </Alert>
            ) : (
              <Button asChild size="lg" className="w-full font-bold">
                <Link href="/checkout">
                  Finalizar compra <ArrowRight />
                </Link>
              </Button>
            )}

            <p className="text-center text-xs text-muted-foreground">
              Projeto acadêmico — nenhuma compra é real.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
