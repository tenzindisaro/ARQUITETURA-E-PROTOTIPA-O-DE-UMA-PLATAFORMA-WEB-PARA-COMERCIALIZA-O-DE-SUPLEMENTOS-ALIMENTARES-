import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CheckCircle2, Package, Truck } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getOrderById } from "@/lib/services/orders";
import { PAYMENT_METHOD_LABEL } from "@/lib/services/payments";
import { formatPrice, formatOrderNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pedido confirmado" };

export default async function Page(props: PageProps<"/checkout/confirmacao/[id]">) {
  const { id } = await props.params;
  const user = await requireUser();

  const pedido = await getOrderById(id);
  if (!pedido || pedido.userId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-success/15">
          <CheckCircle2 className="size-8 text-success" />
        </div>
        <h1 className="text-3xl font-black tracking-tight">Pedido realizado com sucesso!</h1>
        <p className="mt-2 text-muted-foreground">
          Número do pedido{" "}
          <strong className="font-mono text-foreground">
            {formatOrderNumber(pedido.number)}
          </strong>
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="size-4 text-primary" /> Itens
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {pedido.items.map((item) => (
              <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface">
                  {item.imageUrl && (
                    <Image src={item.imageUrl} alt="" fill sizes="64px" className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-tight">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.variantName} · {item.quantity}x {formatPrice(Number(item.unitPrice))}
                  </p>
                </div>
                <span className="text-sm font-bold">
                  {formatPrice(Number(item.lineTotal))}
                </span>
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
              <dd>
                {Number(pedido.shippingTotal) === 0
                  ? "Grátis"
                  : formatPrice(Number(pedido.shippingTotal))}
              </dd>
            </div>
            <div className="flex items-baseline justify-between pt-2">
              <dt className="font-bold">Total</dt>
              <dd className="text-xl font-black text-primary">
                {formatPrice(Number(pedido.total))}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="size-4 text-primary" /> Entrega e pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="mb-1 font-semibold">Endereço</p>
            <address className="not-italic text-muted-foreground">
              {pedido.shipRecipient}
              <br />
              {pedido.shipStreet}, {pedido.shipNumber}
              {pedido.shipComplement ? ` — ${pedido.shipComplement}` : ""}
              <br />
              {pedido.shipDistrict}, {pedido.shipCity}/{pedido.shipState}
              <br />
              CEP {pedido.shipZipCode.replace(/(\d{5})(\d{3})/, "$1-$2")}
            </address>
          </div>
          <div>
            <p className="mb-1 font-semibold">Pagamento</p>
            <p className="text-muted-foreground">
              {pedido.payment ? PAYMENT_METHOD_LABEL[pedido.payment.method] : "—"}
              <br />
              Aprovado em{" "}
              {pedido.paidAt?.toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
              <br />
              <span className="font-mono text-xs">{pedido.payment?.externalId}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <Link href={`/minha-conta/pedidos/${pedido.number}`}>Acompanhar pedido</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/produtos">Continuar comprando</Link>
        </Button>
      </div>
    </div>
  );
}
