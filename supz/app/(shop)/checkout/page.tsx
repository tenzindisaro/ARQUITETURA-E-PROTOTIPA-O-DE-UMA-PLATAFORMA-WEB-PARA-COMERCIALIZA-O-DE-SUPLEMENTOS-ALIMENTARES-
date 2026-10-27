import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ShoppingCart, Package } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getCartSummary } from "@/lib/services/cart";
import { listAddresses } from "@/lib/services/addresses";
import { formatPrice } from "@/lib/format";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout" };

export default async function Page() {
  const user = await requireUser("/checkout");
  const cart = await getCartSummary();

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-secondary">
          <ShoppingCart className="size-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-black">Seu carrinho está vazio</h1>
        <Button asChild size="lg" className="mt-6">
          <Link href="/produtos">Ver produtos</Link>
        </Button>
      </div>
    );
  }

  // Quantidade acima do estoque tem de ser corrigida antes de fechar o pedido.
  if (cart.hasStockIssue) redirect("/carrinho");

  const enderecos = await listAddresses(user.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-3xl font-black tracking-tight">Finalizar compra</h1>
      <p className="mb-8 text-muted-foreground">
        Comprando como <strong>{user.name}</strong> ({user.email})
      </p>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <CheckoutForm
          addresses={enderecos.map((a) => ({
            id: a.id, label: a.label, recipient: a.recipient, zipCode: a.zipCode,
            street: a.street, number: a.number, complement: a.complement,
            district: a.district, city: a.city, state: a.state, isDefault: a.isDefault,
          }))}
          subtotal={cart.subtotal}
        />

        <aside className="lg:sticky lg:top-36 lg:h-fit">
          <div className="space-y-5 rounded-2xl border bg-card p-6">
            <h2 className="text-lg font-bold">Resumo do pedido</h2>

            <ul className="space-y-3">
              {cart.lines.map((l) => (
                <li key={l.itemId} className="flex gap-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface">
                    {l.imageUrl ? (
                      <Image src={l.imageUrl} alt="" fill sizes="56px" className="object-cover" />
                    ) : (
                      <Package className="m-auto size-5 text-muted-foreground/30" />
                    )}
                    <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {l.quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-semibold leading-tight">
                      {l.productName}
                    </p>
                    <p className="text-xs text-muted-foreground">{l.variantName}</p>
                  </div>
                  <span className="text-sm font-bold">{formatPrice(l.lineTotal)}</span>
                </li>
              ))}
            </ul>

            <Separator />

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatPrice(cart.subtotal)}</dd>
              </div>
              {cart.discount > 0 && (
                <div className="flex justify-between text-success">
                  <dt>Cupom {cart.coupon?.code}</dt>
                  <dd>−{formatPrice(cart.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Frete</dt>
                <dd>
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

            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href="/carrinho">← Voltar ao carrinho</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
