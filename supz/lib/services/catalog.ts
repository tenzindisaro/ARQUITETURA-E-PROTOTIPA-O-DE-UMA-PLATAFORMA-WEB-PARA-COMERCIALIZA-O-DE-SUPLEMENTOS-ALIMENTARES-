import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/prisma/generated/client";
import { resolvePrice, activeFlashSaleFilter } from "@/lib/pricing";
import type { SortKey } from "@/lib/catalog-sort";

/**
 * Formato que a vitrine consome. Achata produto + marca + categoria + imagem
 * principal + preço resolvido, para o componente de card não precisar saber
 * nada sobre o schema.
 */
export interface ProductCard {
  id: string;
  name: string;
  slug: string;
  brandName: string;
  categoryName: string;
  categorySlug: string;
  imageUrl: string | null;
  imageAlt: string;
  listPrice: number;
  currentPrice: number;
  discountPercent: number;
  hasDiscount: boolean;
  isFlash: boolean;
  ratingAverage: number;
  reviewCount: number;
  totalStock: number;
  variants: Array<{ id: string; name: string; stock: number; priceDelta: number }>;
  flash: { promoPrice: number; stockLimit: number | null; soldCount: number } | null;
}

const cardInclude = {
  brand: { select: { name: true } },
  category: { select: { name: true, slug: true } },
  images: { where: { isPrimary: true }, take: 1 },
  variants: {
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  },
  flashItems: { where: activeFlashSaleFilter(), take: 1 },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export function toProductCard(p: ProductWithRelations): ProductCard {
  const flash = p.flashItems[0] ?? null;
  // O preço mostrado no card é o da variante mais barata disponível.
  const cheapest =
    [...p.variants].sort((a, b) => Number(a.priceDelta) - Number(b.priceDelta))[0] ?? null;

  const price = resolvePrice({
    price: p.price,
    salePrice: p.salePrice,
    priceDelta: cheapest?.priceDelta,
    flashPrice: flash?.promoPrice,
  });

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    brandName: p.brand.name,
    categoryName: p.category.name,
    categorySlug: p.category.slug,
    imageUrl: p.images[0]?.url ?? null,
    imageAlt: p.images[0]?.altText ?? p.name,
    ...price,
    ratingAverage: Number(p.ratingAverage),
    reviewCount: p.reviewCount,
    totalStock: p.variants.reduce((s, v) => s + v.stock, 0),
    variants: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      stock: v.stock,
      priceDelta: Number(v.priceDelta),
    })),
    flash: flash
      ? {
          promoPrice: Number(flash.promoPrice),
          stockLimit: flash.stockLimit,
          soldCount: flash.soldCount,
        }
      : null,
  };
}

// ─────────────────────────── Catálogo ───────────────────────────

export interface CatalogFilters {
  q?: string;
  categorySlug?: string;
  brandSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: SortKey;
  page?: number;
  perPage?: number;
}

export interface CatalogResult {
  products: ProductCard[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

const PER_PAGE = 12;

/**
 * A ordenação e o filtro por preço precisam usar o preço *efetivo* — o mesmo
 * que `resolvePrice` calcula: promoção relâmpago vence preço promocional, que
 * vence preço de tabela. Como isso depende de um LEFT JOIN com janela de tempo,
 * o Prisma Client não consegue expressar em `orderBy`; então esta consulta
 * resolve em SQL apenas os IDs da página, e o Prisma hidrata os dados.
 *
 * O CASE abaixo é o espelho de `resolvePrice()` em lib/pricing.ts. Se a regra
 * de precificação mudar, os dois precisam mudar juntos.
 */
export async function listProducts(filters: CatalogFilters = {}): Promise<CatalogResult> {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = filters.perPage ?? PER_PAGE;
  const offset = (page - 1) * perPage;

  const conditions: Prisma.Sql[] = [Prisma.sql`p."isActive" = true`];

  if (filters.q) {
    const termo = `%${filters.q}%`;
    conditions.push(Prisma.sql`(
      p.name ILIKE ${termo}
      OR p.description ILIKE ${termo}
      OR b.name ILIKE ${termo}
      OR c.name ILIKE ${termo}
    )`);
  }
  if (filters.categorySlug) {
    conditions.push(Prisma.sql`c.slug = ${filters.categorySlug}`);
  }
  if (filters.brandSlug) {
    conditions.push(Prisma.sql`b.slug = ${filters.brandSlug}`);
  }
  if (filters.minRating) {
    conditions.push(Prisma.sql`p."ratingAverage" >= ${filters.minRating}`);
  }
  if (filters.minPrice !== undefined) {
    conditions.push(Prisma.sql`effective.price >= ${filters.minPrice}`);
  }
  if (filters.maxPrice !== undefined) {
    conditions.push(Prisma.sql`effective.price <= ${filters.maxPrice}`);
  }

  const where = Prisma.join(conditions, " AND ");

  const orderBy = {
    relevancia: Prisma.sql`p."isFeatured" DESC, p."soldCount" DESC, p.name ASC`,
    "menor-preco": Prisma.sql`effective.price ASC`,
    "maior-preco": Prisma.sql`effective.price DESC`,
    avaliacao: Prisma.sql`p."ratingAverage" DESC, p."reviewCount" DESC`,
    recentes: Prisma.sql`p."createdAt" DESC`,
    "mais-vendidos": Prisma.sql`p."soldCount" DESC`,
  }[filters.sort ?? "relevancia"];

  // Preço efetivo, calculado com a variante mais barata do produto.
  const base = Prisma.sql`
    FROM "Product" p
    JOIN "Brand" b ON b.id = p."brandId"
    JOIN "Category" c ON c.id = p."categoryId"
    LEFT JOIN LATERAL (
      SELECT fi."promoPrice"
      FROM "FlashSaleItem" fi
      JOIN "FlashSale" fs ON fs.id = fi."flashSaleId"
      WHERE fi."productId" = p.id
        AND fs."isActive" = true
        AND fs."startsAt" <= now()
        AND fs."endsAt" > now()
      LIMIT 1
    ) flash ON true
    LEFT JOIN LATERAL (
      SELECT COALESCE(MIN(v."priceDelta"), 0) AS delta
      FROM "ProductVariant" v
      WHERE v."productId" = p.id AND v."isActive" = true
    ) variant ON true
    LEFT JOIN LATERAL (
      SELECT COALESCE(flash."promoPrice", p."salePrice", p.price) + variant.delta AS price
    ) effective ON true
    WHERE ${where}
  `;

  const [rows, totalRows] = await Promise.all([
    db.$queryRaw<Array<{ id: string }>>`
      SELECT p.id ${base} ORDER BY ${orderBy} LIMIT ${perPage} OFFSET ${offset}
    `,
    db.$queryRaw<Array<{ total: bigint }>>`
      SELECT count(*)::bigint AS total ${base}
    `,
  ]);

  const total = Number(totalRows[0]?.total ?? 0);
  const ids = rows.map((r) => r.id);

  if (ids.length === 0) {
    return { products: [], total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  const produtos = await db.product.findMany({
    where: { id: { in: ids } },
    include: cardInclude,
  });

  // `IN` não preserva ordem; reordena conforme o resultado da consulta.
  const porId = new Map(produtos.map((p) => [p.id, p]));
  const products = ids
    .map((id) => porId.get(id))
    .filter((p): p is ProductWithRelations => Boolean(p))
    .map(toProductCard);

  return { products, total, page, perPage, totalPages: Math.ceil(total / perPage) };
}

export async function getFeaturedProducts(limit = 8): Promise<ProductCard[]> {
  const produtos = await db.product.findMany({
    where: { isActive: true, isFeatured: true },
    include: cardInclude,
    orderBy: [{ soldCount: "desc" }, { name: "asc" }],
    take: limit,
  });
  return produtos.map(toProductCard);
}

/** Promoção relâmpago em vigor, com os produtos participantes. */
export async function getActiveFlashSale() {
  const agora = new Date();
  const sale = await db.flashSale.findFirst({
    where: { isActive: true, startsAt: { lte: agora }, endsAt: { gt: agora } },
    orderBy: { endsAt: "asc" },
    include: {
      items: {
        include: { product: { include: cardInclude } },
        orderBy: { promoPrice: "asc" },
      },
    },
  });

  if (!sale) return null;

  return {
    id: sale.id,
    name: sale.name,
    endsAt: sale.endsAt,
    products: sale.items
      .filter((item) => item.product.isActive)
      .map((item) => toProductCard(item.product)),
  };
}

export async function getCategories() {
  return db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });
}

export async function getBrands() {
  return db.brand.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
}

export async function getCategoryBySlug(slug: string) {
  return db.category.findFirst({ where: { slug, isActive: true } });
}

/** Faixa de preço efetiva do catálogo, para calibrar o filtro. */
export async function getPriceRange() {
  const [row] = await db.$queryRaw<Array<{ min: number | null; max: number | null }>>`
    SELECT
      MIN(COALESCE(p."salePrice", p.price))::float AS min,
      MAX(COALESCE(p."salePrice", p.price))::float AS max
    FROM "Product" p WHERE p."isActive" = true
  `;
  return { min: Math.floor(row?.min ?? 0), max: Math.ceil(row?.max ?? 500) };
}

// ────────────────────── Página do produto ───────────────────────

export async function getProductBySlug(slug: string) {
  const produto = await db.product.findFirst({
    where: { slug, isActive: true },
    include: {
      brand: true,
      category: true,
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      flashItems: { where: activeFlashSaleFilter(), include: { flashSale: true }, take: 1 },
    },
  });

  if (!produto) return null;

  const flash = produto.flashItems[0] ?? null;

  return {
    ...produto,
    price: Number(produto.price),
    salePrice: produto.salePrice === null ? null : Number(produto.salePrice),
    ratingAverage: Number(produto.ratingAverage),
    flashPromoPrice: flash ? Number(flash.promoPrice) : null,
    flashEndsAt: flash?.flashSale.endsAt ?? null,
    variants: produto.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      stock: v.stock,
      priceDelta: Number(v.priceDelta),
    })),
  };
}

export async function getRelatedProducts(
  categoryId: string,
  excludeId: string,
  limit = 4,
): Promise<ProductCard[]> {
  const produtos = await db.product.findMany({
    where: { isActive: true, categoryId, id: { not: excludeId } },
    include: cardInclude,
    orderBy: { soldCount: "desc" },
    take: limit,
  });
  return produtos.map(toProductCard);
}
