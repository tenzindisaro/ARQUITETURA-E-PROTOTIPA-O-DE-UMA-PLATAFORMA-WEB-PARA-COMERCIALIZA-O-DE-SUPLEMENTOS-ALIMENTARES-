"use server";

import { revalidatePath } from "next/cache";
import {
  addItem,
  updateItemQuantity,
  removeItem,
  applyCoupon,
  removeCoupon,
} from "@/lib/services/cart";
import { ServiceError } from "@/lib/services/auth";
import { failure, type ActionResult } from "@/lib/action-result";

/** Toda ação de carrinho revalida as telas que mostram o total. */
function revalidarCarrinho() {
  revalidatePath("/carrinho");
  revalidatePath("/checkout");
  revalidatePath("/", "layout");
}

async function executar(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
    revalidarCarrinho();
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) return failure(error.message);
    throw error;
  }
}

export async function adicionarAoCarrinho(variantId: string, quantidade = 1) {
  return executar(() => addItem(variantId, quantidade));
}

export async function alterarQuantidade(itemId: string, quantidade: number) {
  return executar(() => updateItemQuantity(itemId, quantidade));
}

export async function removerDoCarrinho(itemId: string) {
  return executar(() => removeItem(itemId));
}

export async function aplicarCupom(codigo: string) {
  return executar(async () => {
    await applyCoupon(codigo);
  });
}

export async function removerCupom() {
  return executar(() => removeCoupon());
}
