import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getAdminProduct, getBrandsAndCategories } from "@/lib/services/products-admin";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImages } from "@/components/admin/product-images";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/admin/produtos/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const produto = await getAdminProduct(id);
  return { title: produto ? `Editar ${produto.name}` : "Produto" };
}

export default async function Page(props: PageProps<"/admin/produtos/[id]">) {
  const { id } = await props.params;
  const [produto, { brands, categories }] = await Promise.all([
    getAdminProduct(id),
    getBrandsAndCategories(),
  ]);

  if (!produto) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-1">
            <Link href="/admin/produtos">← Produtos</Link>
          </Button>
          <h1 className="text-3xl font-black tracking-tight">{produto.name}</h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/produtos/${produto.slug}`} target="_blank">
            Ver na loja <ExternalLink />
          </Link>
        </Button>
      </div>

      <ProductImages productId={produto.id} images={produto.images} />

      <ProductForm
        productId={produto.id}
        categories={categories}
        brands={brands}
        defaultValues={{
          name: produto.name,
          slug: produto.slug,
          description: produto.description,
          nutritionalInfo: produto.nutritionalInfo ?? "",
          usageInstructions: produto.usageInstructions ?? "",
          netWeight: produto.netWeight ?? "",
          categoryId: produto.categoryId,
          brandId: produto.brandId,
          price: Number(produto.price),
          salePrice: produto.salePrice === null ? null : Number(produto.salePrice),
          isActive: produto.isActive,
          isFeatured: produto.isFeatured,
          metaTitle: produto.metaTitle ?? "",
          metaDescription: produto.metaDescription ?? "",
          variants: produto.variants.map((v) => ({
            id: v.id, name: v.name, sku: v.sku,
            priceDelta: Number(v.priceDelta), stock: v.stock,
            lowStockThreshold: v.lowStockThreshold, isActive: v.isActive,
          })),
        }}
      />
    </div>
  );
}
