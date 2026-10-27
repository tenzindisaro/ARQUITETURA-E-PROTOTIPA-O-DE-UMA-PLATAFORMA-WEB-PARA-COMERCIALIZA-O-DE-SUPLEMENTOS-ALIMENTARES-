import "server-only";
import { db } from "@/lib/db";
import { OrderStatus } from "@/prisma/generated/enums";

/** Pedidos que já representam receita (cancelados ficam de fora). */
const FATURADOS = {
  status: {
    in: [
      OrderStatus.PAID, OrderStatus.PROCESSING,
      OrderStatus.SHIPPED, OrderStatus.DELIVERED,
    ],
  },
};

export async function getDashboardStats() {
  const inicioDoMes = new Date();
  inicioDoMes.setDate(1);
  inicioDoMes.setHours(0, 0, 0, 0);

  const [
    faturamento, faturamentoMes, totalPedidos, pendentes,
    produtos, clientes, assinantes, estoqueBaixo, recentes,
  ] = await Promise.all([
    db.order.aggregate({ where: FATURADOS, _sum: { total: true }, _count: true }),
    db.order.aggregate({
      where: { ...FATURADOS, createdAt: { gte: inicioDoMes } },
      _sum: { total: true }, _count: true,
    }),
    db.order.count(),
    db.order.count({ where: { status: OrderStatus.PENDING_PAYMENT } }),
    db.product.count({ where: { isActive: true } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.newsletterSubscriber.count({ where: { isActive: true } }),
    db.$queryRaw<Array<{ total: bigint }>>`
      SELECT count(*)::bigint AS total FROM "ProductVariant"
      WHERE "isActive" = true AND stock <= "lowStockThreshold"
    `,
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true } } },
    }),
  ]);

  return {
    faturamentoTotal: Number(faturamento._sum.total ?? 0),
    pedidosFaturados: faturamento._count,
    faturamentoMes: Number(faturamentoMes._sum.total ?? 0),
    pedidosMes: faturamentoMes._count,
    totalPedidos,
    pedidosPendentes: pendentes,
    produtosAtivos: produtos,
    clientes,
    assinantesNewsletter: assinantes,
    variantesEstoqueBaixo: Number(estoqueBaixo[0]?.total ?? 0),
    pedidosRecentes: recentes,
    ticketMedio: faturamento._count
      ? Number(faturamento._sum.total ?? 0) / faturamento._count
      : 0,
  };
}

/** Faturamento diário dos últimos N dias, com os dias sem venda preenchidos. */
export async function getSalesByDay(days = 30) {
  const linhas = await db.$queryRaw<Array<{ dia: Date; total: number; pedidos: bigint }>>`
    SELECT
      date_trunc('day', "createdAt") AS dia,
      SUM(total)::float AS total,
      count(*)::bigint AS pedidos
    FROM "Order"
    WHERE status <> 'CANCELLED'
      AND "createdAt" >= now() - (${days} || ' days')::interval
    GROUP BY 1
    ORDER BY 1
  `;

  const porDia = new Map(
    linhas.map((l) => [l.dia.toISOString().slice(0, 10), l]),
  );

  const resultado: Array<{ dia: string; total: number; pedidos: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const data = new Date();
    data.setHours(0, 0, 0, 0);
    data.setDate(data.getDate() - i);
    const chave = data.toISOString().slice(0, 10);
    const linha = porDia.get(chave);
    resultado.push({
      dia: chave,
      total: linha ? Number(linha.total) : 0,
      pedidos: linha ? Number(linha.pedidos) : 0,
    });
  }
  return resultado;
}

export async function getTopProducts(limit = 10) {
  return db.$queryRaw<
    Array<{ nome: string; slug: string; unidades: bigint; receita: number }>
  >`
    SELECT
      oi."productName" AS nome,
      oi."productSlug" AS slug,
      SUM(oi.quantity)::bigint AS unidades,
      SUM(oi."lineTotal")::float AS receita
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    WHERE o.status <> 'CANCELLED'
    GROUP BY 1, 2
    ORDER BY unidades DESC
    LIMIT ${limit}
  `;
}

export async function getSalesByCategory() {
  return db.$queryRaw<Array<{ categoria: string; unidades: bigint; receita: number }>>`
    SELECT
      c.name AS categoria,
      SUM(oi.quantity)::bigint AS unidades,
      SUM(oi."lineTotal")::float AS receita
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    JOIN "ProductVariant" v ON v.id = oi."variantId"
    JOIN "Product" p ON p.id = v."productId"
    JOIN "Category" c ON c.id = p."categoryId"
    WHERE o.status <> 'CANCELLED'
    GROUP BY 1
    ORDER BY receita DESC
  `;
}

export async function getOrderCountsByStatus() {
  const linhas = await db.order.groupBy({ by: ["status"], _count: true });
  return Object.fromEntries(linhas.map((l) => [l.status, l._count])) as Record<
    OrderStatus,
    number | undefined
  >;
}

export async function getCouponUsage() {
  return db.coupon.findMany({
    orderBy: { usedCount: "desc" },
    include: {
      _count: { select: { redemptions: true } },
      redemptions: { select: { amount: true } },
    },
  });
}

export async function getCustomerReport() {
  return db.$queryRaw<
    Array<{ nome: string; email: string; pedidos: bigint; gasto: number; ultimo: Date | null }>
  >`
    SELECT
      u.name AS nome,
      u.email,
      count(o.id)::bigint AS pedidos,
      COALESCE(SUM(CASE WHEN o.status <> 'CANCELLED' THEN o.total ELSE 0 END), 0)::float AS gasto,
      MAX(o."createdAt") AS ultimo
    FROM "User" u
    LEFT JOIN "Order" o ON o."userId" = u.id
    WHERE u.role = 'CUSTOMER'
    GROUP BY u.id, u.name, u.email
    ORDER BY gasto DESC
  `;
}
