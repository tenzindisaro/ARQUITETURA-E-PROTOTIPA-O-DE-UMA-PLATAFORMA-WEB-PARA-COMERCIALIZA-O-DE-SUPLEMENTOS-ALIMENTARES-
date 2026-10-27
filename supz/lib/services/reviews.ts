import "server-only";
import { db } from "@/lib/db";
import { OrderStatus } from "@/prisma/generated/enums";
import { ServiceError } from "@/lib/services/auth";

export async function listProductReviews(productId: string, limit = 20) {
  return db.review.findMany({
    where: { productId, isApproved: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true } } },
  });
}

/** Distribuição de notas, para a barra de 5★ a 1★ na página do produto. */
export async function getRatingBreakdown(productId: string) {
  const linhas = await db.review.groupBy({
    by: ["rating"],
    where: { productId, isApproved: true },
    _count: true,
  });

  const mapa = new Map(linhas.map((l) => [l.rating, l._count]));
  return [5, 4, 3, 2, 1].map((nota) => ({ rating: nota, count: mapa.get(nota) ?? 0 }));
}

/**
 * Prova de compra: o usuário só pode avaliar um produto que consta em um pedido
 * dele já entregue. Devolve o item do pedido que autoriza a avaliação, ou null.
 */
export async function findReviewableOrderItem(userId: string, productId: string) {
  return db.orderItem.findFirst({
    where: {
      variant: { productId },
      order: { userId, status: OrderStatus.DELIVERED },
    },
    orderBy: { order: { createdAt: "desc" } },
    select: { id: true, orderId: true },
  });
}

export async function getUserReview(userId: string, productId: string) {
  return db.review.findUnique({ where: { userId_productId: { userId, productId } } });
}

export interface ReviewInput {
  productId: string;
  rating: number;
  title?: string;
  comment: string;
}

/**
 * Cria ou atualiza a avaliação e recalcula os agregados do produto na mesma
 * transação — `ratingAverage` e `reviewCount` alimentam filtro e ordenação, e
 * não podem divergir das avaliações.
 */
export async function upsertReview(userId: string, input: ReviewInput) {
  const item = await findReviewableOrderItem(userId, input.productId);
  if (!item) {
    throw new ServiceError(
      "Só é possível avaliar produtos de pedidos já entregues para você.",
    );
  }

  await db.$transaction(async (tx) => {
    await tx.review.upsert({
      where: { userId_productId: { userId, productId: input.productId } },
      create: {
        userId,
        productId: input.productId,
        orderItemId: item.id,
        rating: input.rating,
        title: input.title || null,
        comment: input.comment,
      },
      update: {
        rating: input.rating,
        title: input.title || null,
        comment: input.comment,
      },
    });

    const agg = await tx.review.aggregate({
      where: { productId: input.productId, isApproved: true },
      _avg: { rating: true },
      _count: true,
    });

    await tx.product.update({
      where: { id: input.productId },
      data: {
        ratingAverage: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0,
        reviewCount: agg._count,
      },
    });
  });
}
