import type { Metadata } from "next";
import Link from "next/link";
import { listAdminOrders } from "@/lib/services/coupons-admin";
import { getOrderCountsByStatus } from "@/lib/services/admin-reports";
import { STATUS_LABEL } from "@/lib/services/orders";
import { formatPrice, formatOrderNumber } from "@/lib/format";
import { OrderStatusBadge } from "@/components/shop/order-status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pedidos" };

const ABAS = [
  { key: "todos", label: "Todos" },
  { key: "PENDING_PAYMENT", label: STATUS_LABEL.PENDING_PAYMENT },
  { key: "PAID", label: STATUS_LABEL.PAID },
  { key: "PROCESSING", label: STATUS_LABEL.PROCESSING },
  { key: "SHIPPED", label: STATUS_LABEL.SHIPPED },
  { key: "DELIVERED", label: STATUS_LABEL.DELIVERED },
  { key: "CANCELLED", label: STATUS_LABEL.CANCELLED },
];

export default async function Page(props: PageProps<"/admin/pedidos">) {
  const raw = await props.searchParams;
  const status = typeof raw.status === "string" ? raw.status : "todos";
  const q = typeof raw.q === "string" ? raw.q : undefined;

  const [pedidos, contagens] = await Promise.all([
    listAdminOrders(status, q),
    getOrderCountsByStatus(),
  ]);

  const totalGeral = Object.values(contagens).reduce<number>((s, n) => s + (n ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Pedidos</h1>
        <p className="text-muted-foreground">{totalGeral} pedidos no total</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ABAS.map((aba) => {
          const n = aba.key === "todos" ? totalGeral : (contagens[aba.key as never] ?? 0);
          const ativa = status === aba.key;
          return (
            <Button
              key={aba.key} asChild size="sm"
              variant={ativa ? "default" : "outline"}
            >
              <Link href={`/admin/pedidos?status=${aba.key}`}>
                {aba.label} <span className="ml-1 opacity-60">{n}</span>
              </Link>
            </Button>
          );
        })}
      </div>

      <form className="max-w-sm">
        <input type="hidden" name="status" value={status} />
        <Input name="q" defaultValue={q} placeholder="Buscar por número, cliente ou e-mail..." />
      </form>

      <div className="rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Itens</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pedidos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Nenhum pedido encontrado.
                </TableCell>
              </TableRow>
            ) : (
              pedidos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono font-bold">
                    {formatOrderNumber(p.number)}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{p.user.name}</p>
                    <p className="text-xs text-muted-foreground">{p.user.email}</p>
                  </TableCell>
                  <TableCell className="text-right">{p._count.items}</TableCell>
                  <TableCell className="text-right font-bold">
                    {formatPrice(Number(p.total))}
                  </TableCell>
                  <TableCell><OrderStatusBadge status={p.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.createdAt.toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/pedidos/${p.id}`}>Detalhes</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
