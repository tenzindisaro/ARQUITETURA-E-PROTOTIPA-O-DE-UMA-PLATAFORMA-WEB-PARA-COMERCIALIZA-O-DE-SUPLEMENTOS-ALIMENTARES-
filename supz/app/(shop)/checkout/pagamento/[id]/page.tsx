import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getOrderById } from "@/lib/services/orders";
import { PAYMENT_METHOD_LABEL } from "@/lib/services/payments";
import { formatPrice, formatOrderNumber } from "@/lib/format";
import { PaymentSimulator } from "@/components/shop/payment-simulator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pagamento" };

export default async function Page(props: PageProps<"/checkout/pagamento/[id]">) {
  const { id } = await props.params;
  const user = await requireUser();

  const pedido = await getOrderById(id);
  // Um pedido só é visível para o próprio dono.
  if (!pedido || pedido.userId !== user.id) notFound();

  if (pedido.status !== "PENDING_PAYMENT") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-black">
          Pedido {formatOrderNumber(pedido.number)} já foi pago
        </h1>
        <p className="mt-2 text-muted-foreground">
          Não há pagamento pendente para este pedido.
        </p>
        <Button asChild className="mt-6">
          <Link href={`/minha-conta/pedidos/${pedido.number}`}>Acompanhar pedido</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <header className="mb-8 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">
          Pedido {formatOrderNumber(pedido.number)}
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Pagamento</h1>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Resumo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Forma de pagamento</span>
            <span className="font-medium">
              {pedido.payment ? PAYMENT_METHOD_LABEL[pedido.payment.method] : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Entrega</span>
            <span className="font-medium">{pedido.shippingMethod}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {pedido.items.length} {pedido.items.length === 1 ? "item" : "itens"}
            </span>
            <span>{formatPrice(Number(pedido.subtotal))}</span>
          </div>
          {Number(pedido.discountTotal) > 0 && (
            <div className="flex justify-between text-success">
              <span>Cupom {pedido.couponCode}</span>
              <span>−{formatPrice(Number(pedido.discountTotal))}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Frete</span>
            <span>
              {Number(pedido.shippingTotal) === 0
                ? "Grátis"
                : formatPrice(Number(pedido.shippingTotal))}
            </span>
          </div>
          <Separator />
          <div className="flex items-baseline justify-between">
            <span className="font-bold">Total a pagar</span>
            <span className="text-2xl font-black text-primary">
              {formatPrice(Number(pedido.total))}
            </span>
          </div>
        </CardContent>
      </Card>

      <PaymentSimulator orderId={pedido.id} />
    </div>
  );
}
