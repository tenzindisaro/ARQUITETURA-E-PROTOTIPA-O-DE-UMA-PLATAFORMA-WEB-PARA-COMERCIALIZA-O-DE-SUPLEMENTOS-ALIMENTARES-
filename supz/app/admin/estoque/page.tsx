import type { Metadata } from "next";
import { listStock } from "@/lib/services/products-admin";
import { StockManager } from "@/components/admin/stock-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Estoque" };

export default async function Page() {
  const variantes = await listStock();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Estoque</h1>
        <p className="text-muted-foreground">
          Todo ajuste gera uma movimentação registrada, com motivo e responsável.
        </p>
      </div>

      <StockManager
        items={variantes.map((v) => ({
          id: v.id, name: v.name, sku: v.sku, stock: v.stock,
          lowStockThreshold: v.lowStockThreshold, isActive: v.isActive,
          product: v.product,
        }))}
      />
    </div>
  );
}
