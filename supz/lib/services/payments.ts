import "server-only";
import { db } from "@/lib/db";
import { OrderStatus, PaymentStatus } from "@/prisma/generated/enums";
import { ServiceError } from "@/lib/services/auth";

/**
 * Pagamento simulado. `Payment.provider` é texto justamente para que trocar
 * "SIMULATED" por "MERCADO_PAGO" seja escrever um adapter com esta mesma
 * assinatura — sem alterar o schema nem o resto do fluxo.
 */
export const PAYMENT_PROVIDER = "SIMULATED";

export const PAYMENT_METHOD_LABEL = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  BOLETO: "Boleto bancário",
} as const;

function fakeTransactionId() {
  return `SIM-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

/**
 * Conclui o pagamento de um pedido. `approved` decide o desfecho — na tela de
 * demonstração o cliente escolhe, para que os dois caminhos possam ser
 * apresentados.
 */
export async function settlePayment(
  orderId: string,
  userId: string,
  approved: boolean,
) {
  const pedido = await db.order.findFirst({
    where: { id: orderId, userId },
    include: { payment: true },
  });

  if (!pedido) throw new ServiceError("Pedido não encontrado.");
  if (!pedido.payment) throw new ServiceError("Pedido sem pagamento associado.");

  if (pedido.status !== OrderStatus.PENDING_PAYMENT) {
    throw new ServiceError("Este pedido não está aguardando pagamento.");
  }

  const agora = new Date();

  if (!approved) {
    await db.$transaction([
      db.payment.update({
        where: { id: pedido.payment.id },
        data: {
          status: PaymentStatus.REJECTED,
          externalId: fakeTransactionId(),
          rawPayload: { provider: PAYMENT_PROVIDER, result: "rejected", at: agora.toISOString() },
        },
      }),
      db.orderStatusHistory.create({
        data: {
          orderId: pedido.id,
          status: OrderStatus.PENDING_PAYMENT,
          note: "Pagamento recusado — tente novamente",
          createdAt: agora,
        },
      }),
    ]);

    return { approved: false };
  }

  await db.$transaction([
    db.payment.update({
      where: { id: pedido.payment.id },
      data: {
        status: PaymentStatus.APPROVED,
        paidAt: agora,
        externalId: fakeTransactionId(),
        rawPayload: { provider: PAYMENT_PROVIDER, result: "approved", at: agora.toISOString() },
      },
    }),
    db.order.update({
      where: { id: pedido.id },
      data: { status: OrderStatus.PAID, paidAt: agora },
    }),
    db.orderStatusHistory.create({
      data: {
        orderId: pedido.id,
        status: OrderStatus.PAID,
        note: "Pagamento aprovado",
        createdAt: agora,
      },
    }),
  ]);

  return { approved: true };
}
