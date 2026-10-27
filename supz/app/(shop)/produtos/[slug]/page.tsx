import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Truck, Shield, RefreshCcw } from "lucide-react";
import { getProductBySlug, getRelatedProducts } from "@/lib/services/catalog";
import {
  listProductReviews, getRatingBreakdown, findReviewableOrderItem, getUserReview,
} from "@/lib/services/reviews";
import { getSession } from "@/lib/session";
import { ProductGallery } from "@/components/shop/product-gallery";
import { ProductPurchasePanel } from "@/components/shop/product-purchase-panel";
import { ProductCard } from "@/components/shop/product-card";
import { ReviewList } from "@/components/shop/review-list";
import { ReviewForm } from "@/components/shop/review-form";
import { plural } from "@/lib/format";
import { StarRating } from "@/components/shop/star-rating";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/produtos/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const produto = await getProductBySlug(slug);
  if (!produto) return { title: "Produto não encontrado" };

  return {
    // `absolute` evita que o template do layout ("%s | SUPZ") duplique o
    // sufixo quando o metaTitle cadastrado já traz o nome da loja.
    title: produto.metaTitle ? { absolute: produto.metaTitle } : produto.name,
    description: produto.metaDescription ?? produto.description.slice(0, 155),
    alternates: { canonical: `/produtos/${produto.slug}` },
    openGraph: {
      title: produto.name,
      description: produto.metaDescription ?? produto.description.slice(0, 155),
      images: produto.images[0] ? [{ url: produto.images[0].url }] : undefined,
      type: "website",
    },
  };
}

export default async function Page(props: PageProps<"/produtos/[slug]">) {
  const { slug } = await props.params;
  const produto = await getProductBySlug(slug);
  if (!produto) notFound();

  const session = await getSession();

  const [avaliacoes, distribuicao, relacionados, itemAvaliavel, minhaAvaliacao] =
    await Promise.all([
      listProductReviews(produto.id),
      getRatingBreakdown(produto.id),
      getRelatedProducts(produto.categoryId, produto.id, 4),
      session?.user ? findReviewableOrderItem(session.user.id, produto.id) : null,
      session?.user ? getUserReview(session.user.id, produto.id) : null,
    ]);

  // Dados estruturados para busca (PRD §32).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: produto.name,
    description: produto.description,
    sku: produto.variants[0]?.sku,
    brand: { "@type": "Brand", name: produto.brand.name },
    ...(produto.reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: produto.ratingAverage,
        reviewCount: produto.reviewCount,
      },
    }),
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: produto.flashPromoPrice ?? produto.salePrice ?? produto.price,
      availability: produto.variants.some((v) => v.stock > 0)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Trilha" className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary">Início</Link>
        <ChevronRight className="size-3.5" />
        <Link href="/produtos" className="hover:text-primary">Produtos</Link>
        <ChevronRight className="size-3.5" />
        <Link href={`/categorias/${produto.category.slug}`} className="hover:text-primary">
          {produto.category.name}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{produto.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={produto.images} name={produto.name} />

        <div className="space-y-6">
          <div>
            <Link
              href={`/produtos?marca=${produto.brand.slug}`}
              className="text-sm font-semibold uppercase tracking-wide text-primary hover:underline"
            >
              {produto.brand.name}
            </Link>
            <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight">
              {produto.name}
            </h1>
            {produto.netWeight && (
              <p className="mt-1 text-sm text-muted-foreground">{produto.netWeight}</p>
            )}

            <div className="mt-3 flex items-center gap-2">
              <StarRating rating={produto.ratingAverage} />
              <span className="text-sm text-muted-foreground">
                {produto.reviewCount > 0
                  ? `${produto.ratingAverage.toFixed(1).replace(".", ",")} — ${plural(produto.reviewCount, "avaliação", "avaliações")}`
                  : "Sem avaliações"}
              </span>
            </div>
          </div>

          <ProductPurchasePanel
            variants={produto.variants}
            price={produto.price}
            salePrice={produto.salePrice}
            flashPrice={produto.flashPromoPrice}
            productName={produto.name}
          />

          <ul className="grid gap-3 rounded-2xl border bg-surface p-4 text-sm sm:grid-cols-3">
            {[
              { icon: Truck, label: "Frete grátis acima de R$ 299" },
              { icon: Shield, label: "Certificado ANVISA" },
              { icon: RefreshCcw, label: "30 dias para troca" },
            ].map((b) => (
              <li key={b.label} className="flex items-center gap-2">
                <b.icon className="size-4 shrink-0 text-primary" />
                <span className="text-xs text-muted-foreground">{b.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-14">
        <Tabs defaultValue="descricao">
          <TabsList>
            <TabsTrigger value="descricao">Descrição</TabsTrigger>
            {produto.nutritionalInfo && (
              <TabsTrigger value="nutricional">Informações nutricionais</TabsTrigger>
            )}
            {produto.usageInstructions && (
              <TabsTrigger value="uso">Modo de consumo</TabsTrigger>
            )}
            <TabsTrigger value="avaliacoes">
              Avaliações ({produto.reviewCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="descricao" className="max-w-3xl pt-6 leading-relaxed text-muted-foreground">
            {produto.description}
          </TabsContent>

          {produto.nutritionalInfo && (
            <TabsContent value="nutricional" className="max-w-3xl pt-6">
              <p className="leading-relaxed text-muted-foreground">{produto.nutritionalInfo}</p>
            </TabsContent>
          )}

          {produto.usageInstructions && (
            <TabsContent value="uso" className="max-w-3xl pt-6">
              <p className="leading-relaxed text-muted-foreground">{produto.usageInstructions}</p>
            </TabsContent>
          )}

          <TabsContent value="avaliacoes" className="space-y-8 pt-6">
            {itemAvaliavel && (
              <ReviewForm
                productId={produto.id}
                existing={
                  minhaAvaliacao
                    ? {
                        rating: minhaAvaliacao.rating,
                        title: minhaAvaliacao.title,
                        comment: minhaAvaliacao.comment,
                      }
                    : null
                }
              />
            )}
            <ReviewList
              reviews={avaliacoes}
              average={produto.ratingAverage}
              count={produto.reviewCount}
              breakdown={distribuicao}
            />
          </TabsContent>
        </Tabs>
      </div>

      {relacionados.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-black">Quem viu, viu também</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
            {relacionados.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
