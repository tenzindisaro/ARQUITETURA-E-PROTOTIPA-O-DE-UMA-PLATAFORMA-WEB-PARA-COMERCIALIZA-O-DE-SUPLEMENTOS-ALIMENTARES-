import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listUserOrders } from "@/lib/services/orders";
import { formatPrice, formatOrderNumber } from "@/lib/format";
import { OrderStatusBadge } from "@/components/shop/order-status-badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Meus pedidos" };

export default async function Page() {
  const user = await requireUser("/minha-conta/pedidos");
  const pedidos = await listUserOrders(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Meus pedidos</h1>
        <p className="text-muted-foreground">Acompanhe suas compras na SUPZ.</p>
      </div>

      {pedidos.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card py-16 text-center">
          <Package className="mx-auto mb-3 size-12 text-muted-foreground/30" />
          <p className="font-semibold">Você ainda não fez nenhum pedido</p>
          <Button asChild className="mt-4">
            <Link href="/produtos">Ver produtos</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {pedidos.map((pedido) => (
            <li key={pedido.id} className="rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link
                    href={`/minha-conta/pedidos/${pedido.number}`}
                    className="font-mono font-bold hover:text-primary"
                  >
                    {formatOrderNumber(pedido.number)}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {pedido.createdAt.toLocaleDateString("pt-BR", {
                      day: "2-digit", month: "long", year: "numeric",
                    })}
                  </p>
                </div>
                <OrderStatusBadge status={pedido.status} />
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex -space-x-3">
                  {pedido.items.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="relative size-12 overflow-hidden rounded-lg border-2 border-card bg-surface"
                    >
                      {item.imageUrl && (
                        <Image src={item.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                      )}
                    </div>
                  ))}
                </div>
                {pedido.items.length > 4 && (
                  <span className="text-sm text-muted-foreground">
                    +{pedido.items.length - 4}
                  </span>
                )}
                <span className="ml-auto text-lg font-black text-primary">
                  {formatPrice(Number(pedido.total))}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/minha-conta/pedidos/${pedido.number}`}>Ver detalhes</Link>
                </Button>
                {pedido.status === "PENDING_PAYMENT" && (
                  <Button asChild size="sm">
                    <Link href={`/checkout/pagamento/${pedido.id}`}>Pagar agora</Link>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
