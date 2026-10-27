import type { Metadata } from "next";
import { listAdminCategories } from "@/lib/services/products-admin";
import { CategoryManager } from "@/components/admin/category-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Categorias" };

export default async function Page() {
  const categorias = await listAdminCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Categorias</h1>
        <p className="text-muted-foreground">
          As categorias aparecem no menu da loja na ordem definida aqui.
        </p>
      </div>

      <CategoryManager
        categories={categorias.map((c) => ({
          id: c.id, name: c.name, slug: c.slug, description: c.description,
          sortOrder: c.sortOrder, isActive: c.isActive, _count: c._count,
        }))}
      />
    </div>
  );
}
