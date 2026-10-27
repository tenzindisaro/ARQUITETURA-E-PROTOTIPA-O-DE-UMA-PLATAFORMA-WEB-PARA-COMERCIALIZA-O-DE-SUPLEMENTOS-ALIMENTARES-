import type { Metadata } from "next";
import Link from "next/link";
import {
  DollarSign, ShoppingBag, Clock, Package, Users, TriangleAlert, Mail, TrendingUp,
} from "lucide-react";
import { getDashboardStats, getSalesByDay, getTopProducts } from "@/lib/services/admin-reports";
import { formatPrice, formatOrderNumber } from "@/lib/format";
import { StatCard } from "@/components/admin/stat-card";
import { OrderStatusBadge } from "@/components/shop/order-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard" };

export default async function Page() {
  const [stats, vendas, topProdutos] = await Promise.all([
    getDashboardStats(),
    getSalesByDay(14),
    getTopProducts(5),
  ]);

  const maxDia = Math.max(...vendas.map((v) => v.total), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da operação da loja.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Faturamento total" icon={DollarSign}
          value={formatPrice(stats.faturamentoTotal)}
          hint={`${stats.pedidosFaturados} pedidos faturados`}
          tone="success"
        />
        <StatCard
          label="Faturamento no mês" icon={TrendingUp}
          value={formatPrice(stats.faturamentoMes)}
          hint={`${stats.pedidosMes} pedidos neste mês`}
        />
        <StatCard
          label="Ticket médio" icon={ShoppingBag}
          value={formatPrice(stats.ticketMedio)}
          hint={`${stats.totalPedidos} pedidos no total`}
        />
        <StatCard
          label="Pedidos pendentes" icon={Clock}
          value={stats.pedidosPendentes}
          hint="aguardando pagamento"
          tone={stats.pedidosPendentes > 0 ? "warning" : "default"}
        />
        <StatCard label="Produtos ativos" icon={Package} value={stats.produtosAtivos} />
        <StatCard
          label="Estoque baixo" icon={TriangleAlert}
          value={stats.variantesEstoqueBaixo}
          hint="SKUs no limite mínimo"
          tone={stats.variantesEstoqueBaixo > 0 ? "danger" : "default"}
        />
        <StatCard label="Clientes cadastrados" icon={Users} value={stats.clientes} />
        <StatCard label="Newsletter" icon={Mail} value={stats.assinantesNewsletter} hint="inscritos ativos" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Faturamento — últimos 14 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-stretch gap-1.5">
              {vendas.map((v) => (
                <div key={v.dia} className="group flex flex-1 flex-col items-center gap-1">
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-primary/80 transition-colors group-hover:bg-primary"
                      style={{ height: `${Math.max(2, (v.total / maxDia) * 100)}%` }}
                    />
                    <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-xs text-white group-hover:block">
                      {formatPrice(v.total)}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {v.dia.slice(8, 10)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produtos mais vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {topProdutos.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Ainda não há vendas registradas.
              </p>
            ) : (
              <ol className="space-y-3">
                {topProdutos.map((p, i) => (
                  <li key={p.slug} className="flex items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-bold">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/produtos/${p.slug}`}
                        className="line-clamp-1 text-sm font-medium hover:text-primary"
                      >
                        {p.nome}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {Number(p.unidades)} un. · {formatPrice(p.receita)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Vendas recentes</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/pedidos">Ver todos</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {stats.pedidosRecentes.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                <Link
                  href={`/admin/pedidos/${p.id}`}
                  className="font-mono text-sm font-bold hover:text-primary"
                >
                  {formatOrderNumber(p.number)}
                </Link>
                <span className="text-sm text-muted-foreground">{p.user.name}</span>
                <OrderStatusBadge status={p.status} />
                <span className="ml-auto text-sm font-bold">
                  {formatPrice(Number(p.total))}
                </span>
                <span className="w-20 text-right text-xs text-muted-foreground">
                  {p.createdAt.toLocaleDateString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
