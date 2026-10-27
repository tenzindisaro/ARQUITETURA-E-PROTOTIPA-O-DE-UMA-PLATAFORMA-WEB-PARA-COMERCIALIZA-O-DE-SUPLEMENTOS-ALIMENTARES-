import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getUserOrder } from "@/lib/services/orders";
import { PAYMENT_METHOD_LABEL } from "@/lib/services/payments";
import { formatPrice, formatOrderNumber } from "@/lib/format";
import { OrderStatusBadge } from "@/components/shop/order-status-badge";
import { OrderTimeline } from "@/components/shop/order-timeline";
import { CancelOrderButton } from "@/components/shop/cancel-order-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/minha-conta/pedidos/[number]">,
): Promise<Metadata> {
  const { number } = await props.params;
  return { title: `Pedido ${formatOrderNumber(Number(number))}` };
}

export default async function Page(props: PageProps<"/minha-conta/pedidos/[number]">) {
  const { number } = await props.params;
  const user = await requireUser();

  const numero = Number(number);
  if (!Number.isInteger(numero)) notFound();

  const pedido = await getUserOrder(user.id, numero);
  if (!pedido) notFound();

  const podeCancelar = ["PENDING_PAYMENT", "PAID", "PROCESSING"].includes(pedido.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-1">
            <Link href="/minha-conta/pedidos">← Meus pedidos</Link>
          </Button>
          <h1 className="font-mono text-3xl font-black tracking-tight">
            {formatOrderNumber(pedido.number)}
          </h1>
          <p className="text-sm text-muted-foreground">
            Realizado em{" "}
            {pedido.createdAt.toLocaleString("pt-BR", {
              dateStyle: "long", timeStyle: "short",
            })}
          </p>
        </div>
        <OrderStatusBadge status={pedido.status} className="text-sm" />
      </div>

      {/* Linha do tempo */}
      <Card>
        <CardHeader><CardTitle className="text-base">Acompanhamento</CardTitle></CardHeader>
        <CardContent>
          <OrderTimeline events={pedido.history} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader><CardTitle className="text-base">Itens do pedido</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {pedido.items.map((item) => (
                <li key={item.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                  <Link
                    href={`/produtos/${item.productSlug}`}
                    className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface"
                  >
                    {item.imageUrl && (
                      <Image src={item.imageUrl} alt="" fill sizes="64px" className="object-cover" />
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/produtos/${item.productSlug}`}
                      className="text-sm font-bold leading-tight hover:text-primary"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {item.brandName} · {item.variantName} · SKU {item.sku}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.quantity}x {formatPrice(Number(item.unitPrice))}
                    </p>
                  </div>
                  <span className="text-sm font-bold">
                    {formatPrice(Number(item.lineTotal))}
                  </span>
                </li>
              ))}
            </ul>

            {pedido.status === "DELIVERED" && (
              <p className="mt-4 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
                Pedido entregue — você já pode avaliar estes produtos na página de
                cada um deles.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Valores</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(Number(pedido.subtotal))}</span>
              </div>
              {Number(pedido.discountTotal) > 0 && (
                <div className="flex justify-between text-success">
                  <span>Cupom {pedido.couponCode}</span>
                  <span>−{formatPrice(Number(pedido.discountTotal))}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frete ({pedido.shippingMethod})</span>
                <span>
                  {Number(pedido.shippingTotal) === 0
                    ? "Grátis"
                    : formatPrice(Number(pedido.shippingTotal))}
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex items-baseline justify-between">
                <span className="font-bold">Total</span>
                <span className="text-xl font-black text-primary">
                  {formatPrice(Number(pedido.total))}
                </span>
              </div>
              {pedido.payment && (
                <p className="pt-2 text-xs text-muted-foreground">
                  {PAYMENT_METHOD_LABEL[pedido.payment.method]} ·{" "}
                  {pedido.payment.externalId ?? "sem transação"}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Entrega</CardTitle></CardHeader>
            <CardContent>
              <address className="text-sm not-italic text-muted-foreground">
                {pedido.shipRecipient}
                <br />
                {pedido.shipStreet}, {pedido.shipNumber}
                {pedido.shipComplement ? ` — ${pedido.shipComplement}` : ""}
                <br />
                {pedido.shipDistrict}, {pedido.shipCity}/{pedido.shipState}
                <br />
                CEP {pedido.shipZipCode.replace(/(\d{5})(\d{3})/, "$1-$2")}
              </address>
            </CardContent>
          </Card>

          {pedido.status === "PENDING_PAYMENT" && (
            <Button asChild className="w-full">
              <Link href={`/checkout/pagamento/${pedido.id}`}>Pagar agora</Link>
            </Button>
          )}
          {podeCancelar && <CancelOrderButton orderId={pedido.id} />}
        </div>
      </div>
    </div>
  );
}
