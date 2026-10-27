"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { addressSchema, checkoutSchema } from "@/lib/validations/checkout";
import { createAddress, updateAddress, deleteAddress } from "@/lib/services/addresses";
import { createOrder } from "@/lib/services/orders";
import { settlePayment } from "@/lib/services/payments";
import { ServiceError } from "@/lib/services/auth";
import { failure, type ActionResult } from "@/lib/action-result";

export async function salvarEndereco(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return failure(issue.message, issue.path[0]?.toString());
  }

  const endereco = await createAddress(user.id, parsed.data);
  revalidatePath("/checkout");
  revalidatePath("/minha-conta/enderecos");
  return { ok: true, data: { id: endereco.id } };
}

export async function atualizarEndereco(
  addressId: string,
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return failure(issue.message, issue.path[0]?.toString());
  }

  try {
    await updateAddress(user.id, addressId, parsed.data);
  } catch (error) {
    if (error instanceof ServiceError) return failure(error.message);
    throw error;
  }

  revalidatePath("/minha-conta/enderecos");
  revalidatePath("/checkout");
  return { ok: true };
}

export async function excluirEndereco(addressId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await deleteAddress(user.id, addressId);
  } catch (error) {
    if (error instanceof ServiceError) return failure(error.message);
    throw error;
  }
  revalidatePath("/minha-conta/enderecos");
  return { ok: true };
}

/**
 * Fecha o pedido e leva para a tela de pagamento. Em caso de sucesso a ação
 * redireciona, então nunca retorna.
 */
export async function finalizarPedido(input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return failure(issue.message, issue.path[0]?.toString());
  }

  let orderId: string;
  try {
    const pedido = await createOrder({
      userId: user.id,
      addressId: parsed.data.addressId,
      shippingMethod: parsed.data.shippingMethod as "standard" | "express",
      paymentMethod: parsed.data.paymentMethod,
    });
    orderId = pedido.id;
  } catch (error) {
    if (error instanceof ServiceError) return failure(error.message, error.field);
    throw error;
  }

  revalidatePath("/", "layout");
  redirect(`/checkout/pagamento/${orderId}`);
}

export async function confirmarPagamento(
  orderId: string,
  aprovar: boolean,
): Promise<ActionResult<{ approved: boolean }>> {
  const user = await requireUser();

  try {
    const resultado = await settlePayment(orderId, user.id, aprovar);
    revalidatePath("/minha-conta/pedidos");
    if (resultado.approved) redirect(`/checkout/confirmacao/${orderId}`);
    return { ok: true, data: resultado };
  } catch (error) {
    if (error instanceof ServiceError) return failure(error.message);
    throw error;
  }
}
