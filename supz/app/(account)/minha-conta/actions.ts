"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { cancelOrder } from "@/lib/services/orders";
import { ServiceError } from "@/lib/services/auth";
import { failure, type ActionResult } from "@/lib/action-result";

/** O cliente só pode cancelar um pedido que seja dele. */
export async function cancelarMeuPedido(orderId: string): Promise<ActionResult> {
  const user = await requireUser();

  const pedido = await db.order.findFirst({
    where: { id: orderId, userId: user.id },
    select: { id: true },
  });
  if (!pedido) return failure("Pedido não encontrado.");

  try {
    await cancelOrder(orderId, user.id, "Cancelado pelo cliente");
  } catch (error) {
    if (error instanceof ServiceError) return failure(error.message);
    throw error;
  }

  revalidatePath("/minha-conta/pedidos");
  return { ok: true };
}
