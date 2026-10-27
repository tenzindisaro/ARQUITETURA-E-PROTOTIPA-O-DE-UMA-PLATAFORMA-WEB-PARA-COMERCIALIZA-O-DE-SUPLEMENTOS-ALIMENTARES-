import type { Metadata } from "next";
import Link from "next/link";
import { Package, MapPin, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { Role } from "@/prisma/generated/enums";
import { formatOrderNumber, formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Minha conta" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  PAID: "Pagamento aprovado",
  PROCESSING: "Em preparação",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

export default async function Page() {
  const user = await requireUser("/minha-conta");

  const [pedidos, enderecos] = await Promise.all([
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, number: true, status: true, total: true, createdAt: true },
    }),
    db.address.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Olá, {user.name}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        {user.role === Role.ADMIN && (
          <Button asChild variant="outline">
            <Link href="/admin">
              <ShieldCheck />
              Painel administrativo
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <Package className="size-5 text-primary" />
            <CardTitle className="text-base">Meus pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black">{pedidos.length}</p>
            <p className="text-sm text-muted-foreground">pedidos recentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <MapPin className="size-5 text-primary" />
            <CardTitle className="text-base">Endereços</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black">{enderecos}</p>
            <p className="text-sm text-muted-foreground">cadastrados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {pedidos.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Você ainda não fez nenhum pedido.
            </p>
          ) : (
            <ul className="divide-y">
              {pedidos.map((pedido) => (
                <li
                  key={pedido.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-semibold">{formatOrderNumber(pedido.number)}</p>
                    <p className="text-xs text-muted-foreground">
                      {pedido.createdAt.toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant="secondary">{STATUS_LABEL[pedido.status]}</Badge>
                  <span className="font-bold text-primary">
                    {formatPrice(Number(pedido.total))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
