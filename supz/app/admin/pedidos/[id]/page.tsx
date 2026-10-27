import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getOrderById } from "@/lib/services/orders";
import { PAYMENT_METHOD_LABEL } from "@/lib/services/payments";
import { formatPrice, formatOrderNumber } from "@/lib/format";
import { OrderStatusBadge } from "@/components/shop/order-status-badge";
import { OrderTimeline } from "@/components/shop/order-timeline";
import { OrderStatusControl } from "@/components/admin/order-status-control";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/admin/pedidos/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const pedido = await getOrderById(id);
  return { title: pedido ? `Pedido ${formatOrderNumber(pedido.number)}` : "Pedido" };
}

export default async function Page(props: PageProps<"/admin/pedidos/[id]">) {
  const { id } = await props.params;
  const pedido = await getOrderById(id);
  if (!pedido) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-1">
            <Link href="/admin/pedidos">← Pedidos</Link>
          </Button>
          <h1 className="font-mono text-3xl font-black tracking-tight">
            {formatOrderNumber(pedido.number)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {pedido.createdAt.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}
          </p>
        </div>
        <OrderStatusBadge status={pedido.status} className="text-sm" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Itens</CardTitle></CardHeader>
            <CardContent>
              <ul className="divide-y">
                {pedido.items.map((item) => (
                  <li key={item.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface">
                      {item.imageUrl && (
                        <Image src={item.imageUrl} alt="" fill sizes="56px" className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.brandName} · {item.variantName} · SKU {item.sku}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">
                        {item.quantity} × {formatPrice(Number(item.unitPrice))}
                      </p>
                      <p className="font-bold">{formatPrice(Number(item.lineTotal))}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <Separator className="my-4" />

              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{formatPrice(Number(pedido.subtotal))}</dd>
                </div>
                {Number(pedido.discountTotal) > 0 && (
                  <div className="flex justify-between text-success">
                    <dt>Cupom {pedido.couponCode}</dt>
                    <dd>−{formatPrice(Number(pedido.discountTotal))}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Frete ({pedido.shippingMethod})</dt>
                  <dd>{formatPrice(Number(pedido.shippingTotal))}</dd>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <dt className="font-bold">Total</dt>
                  <dd className="text-xl font-black text-primary">
                    {formatPrice(Number(pedido.total))}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Alterar status</CardTitle></CardHeader>
            <CardContent>
              <OrderStatusControl orderId={pedido.id} status={pedido.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
            <CardContent>
              <OrderTimeline events={pedido.history} showNext={false} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{pedido.user.name}</p>
              <p className="text-muted-foreground">{pedido.user.email}</p>
              {pedido.user.phone && <p className="text-muted-foreground">{pedido.user.phone}</p>}
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link href={`/admin/usuarios?q=${encodeURIComponent(pedido.user.email)}`}>
                  Ver cliente
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Entrega</CardTitle></CardHeader>
            <CardContent>
              <address className="text-sm not-italic text-muted-foreground">
                {pedido.shipRecipient}<br />
                {pedido.shipStreet}, {pedido.shipNumber}
                {pedido.shipComplement ? ` — ${pedido.shipComplement}` : ""}<br />
                {pedido.shipDistrict}, {pedido.shipCity}/{pedido.shipState}<br />
                CEP {pedido.shipZipCode.replace(/(\d{5})(\d{3})/, "$1-$2")}
              </address>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Pagamento</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              {pedido.payment ? (
                <>
                  <p>{PAYMENT_METHOD_LABEL[pedido.payment.method]}</p>
                  <p>Situação: <strong className="text-foreground">{pedido.payment.status}</strong></p>
                  <p>Provedor: {pedido.payment.provider}</p>
                  <p className="font-mono text-xs">{pedido.payment.externalId ?? "—"}</p>
                </>
              ) : (
                <p>Sem pagamento associado.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
