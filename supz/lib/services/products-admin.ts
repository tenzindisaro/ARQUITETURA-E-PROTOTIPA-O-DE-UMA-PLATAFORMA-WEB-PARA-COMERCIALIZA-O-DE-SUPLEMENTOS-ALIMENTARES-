import "server-only";
import { db } from "@/lib/db";
import { StockMovementType } from "@/prisma/generated/enums";
import { ServiceError } from "@/lib/services/auth";
import { deleteProductImageFile } from "@/lib/services/uploads";
import type {
  ProductInput, CategoryInput, BrandInput, StockAdjustmentInput,
} from "@/lib/validations/admin";

// ───────────────────────────── Produtos ─────────────────────────────

export async function listAdminProducts(opts: { q?: string; page?: number; perPage?: number } = {}) {
  const perPage = opts.perPage ?? 20;
  const page = Math.max(1, opts.page ?? 1);

  const where = opts.q
    ? {
        OR: [
          { name: { contains: opts.q, mode: "insensitive" as const } },
          { variants: { some: { sku: { contains: opts.q, mode: "insensitive" as const } } } },
        ],
      }
    : {};

  const [produtos, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        images: { where: { isPrimary: true }, take: 1 },
        variants: { select: { id: true, stock: true, lowStockThreshold: true } },
      },
    }),
    db.product.count({ where }),
  ]);

  return { produtos, total, page, perPage, totalPages: Math.ceil(total / perPage) };
}

export async function getAdminProduct(id: string) {
  return db.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      variants: { orderBy: { sortOrder: "asc" } },
    },
  });
}

function toNullable(v: string | undefined | null) {
  return v && v.length > 0 ? v : null;
}

export async function createProduct(input: ProductInput, adminId: string) {
  const slugEmUso = await db.product.findUnique({ where: { slug: input.slug } });
  if (slugEmUso) throw new ServiceError("Já existe um produto com esta URL.", "slug");

  const skus = input.variants.map((v) => v.sku);
  const skuEmUso = await db.productVariant.findFirst({ where: { sku: { in: skus } } });
  if (skuEmUso) throw new ServiceError(`O SKU ${skuEmUso.sku} já está em uso.`, "variants");

  return db.$transaction(async (tx) => {
    const produto = await tx.product.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        nutritionalInfo: toNullable(input.nutritionalInfo),
        usageInstructions: toNullable(input.usageInstructions),
        netWeight: toNullable(input.netWeight),
        categoryId: input.categoryId,
        brandId: input.brandId,
        price: input.price,
        salePrice: input.salePrice ?? null,
        isActive: input.isActive,
        isFeatured: input.isFeatured,
        metaTitle: toNullable(input.metaTitle),
        metaDescription: toNullable(input.metaDescription),
        variants: {
          create: input.variants.map((v, i) => ({
            name: v.name, sku: v.sku, priceDelta: v.priceDelta,
            stock: v.stock, lowStockThreshold: v.lowStockThreshold,
            isActive: v.isActive, sortOrder: i,
          })),
        },
      },
      include: { variants: true },
    });

    // Estoque inicial entra como movimentação, para o histórico fechar.
    await tx.stockMovement.createMany({
      data: produto.variants
        .filter((v) => v.stock > 0)
        .map((v) => ({
          variantId: v.id,
          type: StockMovementType.INBOUND,
          quantity: v.stock,
          stockAfter: v.stock,
          reason: "Cadastro do produto",
          createdById: adminId,
        })),
    });

    return produto;
  });
}

export async function updateProduct(id: string, input: ProductInput, adminId: string) {
  const existente = await db.product.findUnique({ where: { id }, include: { variants: true } });
  if (!existente) throw new ServiceError("Produto não encontrado.");

  const slugEmUso = await db.product.findFirst({
    where: { slug: input.slug, id: { not: id } },
  });
  if (slugEmUso) throw new ServiceError("Já existe um produto com esta URL.", "slug");

  const idsEnviados = input.variants.map((v) => v.id).filter(Boolean) as string[];
  const removidas = existente.variants.filter((v) => !idsEnviados.includes(v.id));

  // Uma variante que já apareceu em pedido não pode sumir — o item do pedido
  // aponta para ela. Nesse caso, desativa em vez de apagar.
  const comPedidos = removidas.length
    ? await db.orderItem.findMany({
        where: { variantId: { in: removidas.map((v) => v.id) } },
        select: { variantId: true },
        distinct: ["variantId"],
      })
    : [];
  const protegidas = new Set(comPedidos.map((i) => i.variantId));

  return db.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        nutritionalInfo: toNullable(input.nutritionalInfo),
        usageInstructions: toNullable(input.usageInstructions),
        netWeight: toNullable(input.netWeight),
        categoryId: input.categoryId,
        brandId: input.brandId,
        price: input.price,
        salePrice: input.salePrice ?? null,
        isActive: input.isActive,
        isFeatured: input.isFeatured,
        metaTitle: toNullable(input.metaTitle),
        metaDescription: toNullable(input.metaDescription),
      },
    });

    for (const variante of removidas) {
      if (protegidas.has(variante.id)) {
        await tx.productVariant.update({
          where: { id: variante.id },
          data: { isActive: false },
        });
      } else {
        await tx.productVariant.delete({ where: { id: variante.id } });
      }
    }

    for (const [i, v] of input.variants.entries()) {
      if (v.id) {
        const anterior = existente.variants.find((x) => x.id === v.id);
        await tx.productVariant.update({
          where: { id: v.id },
          data: {
            name: v.name, sku: v.sku, priceDelta: v.priceDelta, stock: v.stock,
            lowStockThreshold: v.lowStockThreshold, isActive: v.isActive, sortOrder: i,
          },
        });

        // Estoque alterado na mão vira movimentação rastreável. Aumento entra
        // como INBOUND e redução como ADJUSTMENT: a quantidade é sempre
        // positiva e o sinal vem do tipo, então cada tipo precisa ter uma
        // direção só — senão o saldo deixa de fechar com o histórico.
        if (anterior && anterior.stock !== v.stock) {
          await tx.stockMovement.create({
            data: {
              variantId: v.id,
              type:
                v.stock > anterior.stock
                  ? StockMovementType.INBOUND
                  : StockMovementType.ADJUSTMENT,
              quantity: Math.abs(v.stock - anterior.stock),
              stockAfter: v.stock,
              reason: `Ajuste na edição do produto (${anterior.stock} → ${v.stock})`,
              createdById: adminId,
            },
          });
        }
      } else {
        const nova = await tx.productVariant.create({
          data: {
            productId: id, name: v.name, sku: v.sku, priceDelta: v.priceDelta,
            stock: v.stock, lowStockThreshold: v.lowStockThreshold,
            isActive: v.isActive, sortOrder: i,
          },
        });
        if (nova.stock > 0) {
          await tx.stockMovement.create({
            data: {
              variantId: nova.id,
              type: StockMovementType.INBOUND,
              quantity: nova.stock,
              stockAfter: nova.stock,
              reason: "Nova variante",
              createdById: adminId,
            },
          });
        }
      }
    }
  });
}

/** Exclusão lógica: produto que já foi vendido nunca é apagado de verdade. */
export async function setProductActive(id: string, isActive: boolean) {
  await db.product.update({ where: { id }, data: { isActive } });
}

// ───────────────────────────── Imagens ──────────────────────────────

export async function addProductImage(productId: string, url: string, altText?: string) {
  const jaTem = await db.productImage.count({ where: { productId } });

  return db.productImage.create({
    data: {
      productId,
      url,
      altText: altText || null,
      isPrimary: jaTem === 0, // a primeira imagem vira a principal
      sortOrder: jaTem,
    },
  });
}

export async function setPrimaryImage(productId: string, imageId: string) {
  // O índice parcial no banco garante uma principal por produto; limpar antes
  // de marcar evita bater na restrição.
  await db.$transaction([
    db.productImage.updateMany({ where: { productId }, data: { isPrimary: false } }),
    db.productImage.update({ where: { id: imageId }, data: { isPrimary: true } }),
  ]);
}

export async function deleteProductImage(imageId: string) {
  const imagem = await db.productImage.findUnique({ where: { id: imageId } });
  if (!imagem) throw new ServiceError("Imagem não encontrada.");

  await db.productImage.delete({ where: { id: imageId } });
  await deleteProductImageFile(imagem.url);

  // Se a principal foi removida, promove a próxima.
  if (imagem.isPrimary) {
    const proxima = await db.productImage.findFirst({
      where: { productId: imagem.productId },
      orderBy: { sortOrder: "asc" },
    });
    if (proxima) {
      await db.productImage.update({ where: { id: proxima.id }, data: { isPrimary: true } });
    }
  }
}

// ──────────────────────────── Categorias ────────────────────────────

export async function listAdminCategories() {
  return db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });
}

export async function createCategory(input: CategoryInput) {
  const emUso = await db.category.findFirst({
    where: { OR: [{ slug: input.slug }, { name: input.name }] },
  });
  if (emUso) throw new ServiceError("Já existe uma categoria com este nome ou URL.");

  return db.category.create({
    data: { ...input, description: toNullable(input.description) },
  });
}

export async function updateCategory(id: string, input: CategoryInput) {
  const emUso = await db.category.findFirst({
    where: { OR: [{ slug: input.slug }, { name: input.name }], id: { not: id } },
  });
  if (emUso) throw new ServiceError("Já existe uma categoria com este nome ou URL.");

  return db.category.update({
    where: { id },
    data: { ...input, description: toNullable(input.description) },
  });
}

export async function deleteCategory(id: string) {
  const comProdutos = await db.product.count({ where: { categoryId: id } });
  if (comProdutos > 0) {
    throw new ServiceError(
      `Esta categoria tem ${comProdutos} produto(s). Desative-a em vez de excluir.`,
    );
  }
  await db.category.delete({ where: { id } });
}

// ─────────────────────────────── Marcas ─────────────────────────────

export async function listAdminBrands() {
  return db.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
}

export async function createBrand(input: BrandInput) {
  const emUso = await db.brand.findFirst({
    where: { OR: [{ slug: input.slug }, { name: input.name }] },
  });
  if (emUso) throw new ServiceError("Já existe uma marca com este nome ou URL.");

  return db.brand.create({ data: input });
}

export async function updateBrand(id: string, input: BrandInput) {
  const emUso = await db.brand.findFirst({
    where: { OR: [{ slug: input.slug }, { name: input.name }], id: { not: id } },
  });
  if (emUso) throw new ServiceError("Já existe uma marca com este nome ou URL.");

  return db.brand.update({ where: { id }, data: input });
}

export async function deleteBrand(id: string) {
  const comProdutos = await db.product.count({ where: { brandId: id } });
  if (comProdutos > 0) {
    throw new ServiceError(
      `Esta marca tem ${comProdutos} produto(s). Desative-a em vez de excluir.`,
    );
  }
  await db.brand.delete({ where: { id } });
}

// ───────────────────────────── Estoque ──────────────────────────────

export async function listStock(opts: { onlyLow?: boolean } = {}) {
  const variantes = await db.productVariant.findMany({
    orderBy: [{ stock: "asc" }],
    include: {
      product: { select: { id: true, name: true, slug: true, isActive: true } },
    },
  });

  if (!opts.onlyLow) return variantes;
  return variantes.filter((v) => v.stock <= v.lowStockThreshold);
}

export async function adjustStock(input: StockAdjustmentInput, adminId: string) {
  const variante = await db.productVariant.findUnique({ where: { id: input.variantId } });
  if (!variante) throw new ServiceError("Variante não encontrada.");

  const novo = variante.stock + input.delta;
  if (novo < 0) {
    throw new ServiceError(
      `Saída de ${Math.abs(input.delta)} deixaria o estoque negativo (atual: ${variante.stock}).`,
    );
  }

  await db.$transaction([
    db.productVariant.update({ where: { id: input.variantId }, data: { stock: novo } }),
    db.stockMovement.create({
      data: {
        variantId: input.variantId,
        type: input.delta > 0 ? StockMovementType.INBOUND : StockMovementType.ADJUSTMENT,
        quantity: Math.abs(input.delta),
        stockAfter: novo,
        reason: input.reason,
        createdById: adminId,
      },
    }),
  ]);
}

export async function listStockMovements(variantId: string, limit = 30) {
  return db.stockMovement.findMany({
    where: { variantId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      createdBy: { select: { name: true } },
      order: { select: { number: true } },
    },
  });
}

export async function getBrandsAndCategories() {
  const [brands, categories] = await Promise.all([
    db.brand.findMany({ orderBy: { name: "asc" } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return { brands, categories };
}
