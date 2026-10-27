import type { Metadata } from "next";
import Link from "next/link";
import {
  getSalesByDay, getTopProducts, getSalesByCategory,
  getCustomerReport, getDashboardStats, getOrderCountsByStatus,
} from "@/lib/services/admin-reports";
import { listStock } from "@/lib/services/products-admin";
import { STATUS_LABEL } from "@/lib/services/orders";
import { formatPrice } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Relatórios" };

export default async function Page() {
  const [vendas, top, categorias, clientes, stats, statusCount, estoque] =
    await Promise.all([
      getSalesByDay(30),
      getTopProducts(10),
      getSalesByCategory(),
      getCustomerReport(),
      getDashboardStats(),
      getOrderCountsByStatus(),
      listStock(),
    ]);

  const totalPeriodo = vendas.reduce((s, v) => s + v.total, 0);
  const pedidosPeriodo = vendas.reduce((s, v) => s + v.pedidos, 0);
  const maiorReceita = Math.max(...categorias.map((c) => c.receita), 1);
  const maxDia = Math.max(...vendas.map((v) => v.total), 1);
  const estoqueTotal = estoque.reduce((s, v) => s + v.stock, 0);
  const semEstoque = estoque.filter((v) => v.stock === 0).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">
          Pedidos cancelados ficam de fora de todos os totais de receita.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendas por período — últimos 30 dias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-surface p-4">
              <p className="text-sm text-muted-foreground">Faturamento no período</p>
              <p className="text-2xl font-black text-primary">{formatPrice(totalPeriodo)}</p>
            </div>
            <div className="rounded-xl bg-surface p-4">
              <p className="text-sm text-muted-foreground">Pedidos no período</p>
              <p className="text-2xl font-black">{pedidosPeriodo}</p>
            </div>
            <div className="rounded-xl bg-surface p-4">
              <p className="text-sm text-muted-foreground">Ticket médio</p>
              <p className="text-2xl font-black">
                {formatPrice(pedidosPeriodo ? totalPeriodo / pedidosPeriodo : 0)}
              </p>
            </div>
          </div>

          <div className="flex h-40 items-stretch gap-1">
            {vendas.map((v) => (
              <div key={v.dia} className="group flex flex-1 flex-col items-center">
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                    style={{ height: `${Math.max(2, (v.total / maxDia) * 100)}%` }}
                  />
                  <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-xs text-white group-hover:block">
                    {v.dia.slice(8, 10)}/{v.dia.slice(5, 7)} · {formatPrice(v.total)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Produtos mais vendidos</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top.map((p) => (
                  <TableRow key={p.slug}>
                    <TableCell>
                      <Link href={`/produtos/${p.slug}`} className="text-sm hover:text-primary">
                        {p.nome}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{Number(p.unidades)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(p.receita)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Receita por categoria</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {categorias.map((c) => (
              <div key={c.categoria}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{c.categoria}</span>
                  <span className="text-muted-foreground">
                    {Number(c.unidades)} un. · {formatPrice(c.receita)}
                  </span>
                </div>
                <Progress value={(c.receita / maiorReceita) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Pedidos por situação</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {Object.entries(STATUS_LABEL).map(([key, label]) => (
                <li key={key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-bold">{statusCount[key as never] ?? 0}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Estoque</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-muted-foreground">SKUs cadastrados</span>
                <span className="font-bold">{estoque.length}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Unidades em estoque</span>
                <span className="font-bold">{estoqueTotal}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">SKUs no limite mínimo</span>
                <span className="font-bold text-accent-hover">
                  {stats.variantesEstoqueBaixo}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">SKUs esgotados</span>
                <span className="font-bold text-destructive">{semEstoque}</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Clientes ({clientes.length} cadastrados)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Total gasto</TableHead>
                <TableHead>Último pedido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => (
                <TableRow key={c.email}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.email}</TableCell>
                  <TableCell className="text-right">{Number(c.pedidos)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(c.gasto)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.ultimo ? new Date(c.ultimo).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
