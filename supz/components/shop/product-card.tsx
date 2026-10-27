import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import type { ProductCard as ProductCardData } from "@/lib/services/catalog";
import { StarRating } from "@/components/shop/star-rating";
import { PriceTag } from "@/components/shop/price-tag";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { Badge } from "@/components/ui/badge";

export function ProductCard({ product }: { product: ProductCardData }) {
  const esgotado = product.totalStock === 0;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
      <Link href={`/produtos/${product.slug}`} className="relative block aspect-square bg-surface">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="size-10 text-muted-foreground/30" />
          </div>
        )}

        {product.isFlash && (
          <Badge className="absolute left-3 top-3 bg-accent text-accent-foreground">
            FLASH SALE
          </Badge>
        )}
        {product.hasDiscount && (
          <Badge className="absolute right-3 top-3 bg-destructive text-destructive-foreground">
            -{product.discountPercent}%
          </Badge>
        )}
        {esgotado && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-white">
              ESGOTADO
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {product.brandName}
          </p>
          <h3 className="mt-0.5 line-clamp-2 text-sm font-bold leading-tight">
            <Link href={`/produtos/${product.slug}`} className="hover:text-primary">
              {product.name}
            </Link>
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <StarRating rating={product.ratingAverage} />
          <span className="text-xs text-muted-foreground">
            {product.reviewCount > 0
              ? `${product.ratingAverage.toFixed(1)} (${product.reviewCount})`
              : "sem avaliações"}
          </span>
        </div>

        <PriceTag
          listPrice={product.listPrice}
          currentPrice={product.currentPrice}
          hasDiscount={product.hasDiscount}
        />

        <div className="mt-auto pt-1">
          <AddToCartButton
            variants={product.variants}
            productName={product.name}
            className="w-full"
            size="sm"
          />
        </div>
      </div>
    </article>
  );
}
