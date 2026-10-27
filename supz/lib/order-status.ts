import { OrderStatus } from "@/prisma/generated/enums";

/**
 * Rótulos e transições de status. Vive fora de `lib/services/orders.ts` porque
 * componentes de cliente precisam dessas constantes, e importar do serviço
 * arrastaria Prisma e o driver `pg` para o bundle do navegador.
 */
export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  PAID: "Pagamento aprovado",
  PROCESSING: "Em preparação",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

/** Avanço permitido a partir de cada status. */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: [OrderStatus.PAID, OrderStatus.CANCELLED],
  PAID: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};
