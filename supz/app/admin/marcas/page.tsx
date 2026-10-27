import type { Metadata } from "next";
import { listAdminBrands } from "@/lib/services/products-admin";
import { BrandManager } from "@/components/admin/brand-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Marcas" };

export default async function Page() {
  const marcas = await listAdminBrands();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Marcas</h1>
        <p className="text-muted-foreground">
          A marca é escolhida no cadastro do produto e vira filtro na loja.
        </p>
      </div>

      <BrandManager
        brands={marcas.map((m) => ({
          id: m.id, name: m.name, slug: m.slug,
          isActive: m.isActive, _count: m._count,
        }))}
      />
    </div>
  );
}
