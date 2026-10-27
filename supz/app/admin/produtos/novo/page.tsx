import type { Metadata } from "next";
import Link from "next/link";
import { getBrandsAndCategories } from "@/lib/services/products-admin";
import { ProductForm } from "@/components/admin/product-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Novo produto" };

export default async function Page() {
  const { brands, categories } = await getBrandsAndCategories();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-1">
          <Link href="/admin/produtos">← Produtos</Link>
        </Button>
        <h1 className="text-3xl font-black tracking-tight">Novo produto</h1>
        <p className="text-muted-foreground">
          As imagens podem ser enviadas depois de criar o produto.
        </p>
      </div>

      <ProductForm categories={categories} brands={brands} />
    </div>
  );
}
