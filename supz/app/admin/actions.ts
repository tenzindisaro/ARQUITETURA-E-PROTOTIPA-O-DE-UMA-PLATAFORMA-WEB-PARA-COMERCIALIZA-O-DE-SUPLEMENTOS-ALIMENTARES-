"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import {
  productSchema, categorySchema, brandSchema, couponSchema, stockAdjustmentSchema,
} from "@/lib/validations/admin";
import {
  createProduct, updateProduct, setProductActive, addProductImage,
  setPrimaryImage, deleteProductImage, createCategory, updateCategory,
  deleteCategory, adjustStock, createBrand, updateBrand, deleteBrand,
} from "@/lib/services/products-admin";
import { saveProductImage } from "@/lib/services/uploads";
import { createCoupon, updateCoupon, setCouponActive, deleteCoupon } from "@/lib/services/coupons-admin";
import { setUserActive, setUserRole } from "@/lib/services/users-admin";
import { updateOrderStatus, cancelOrder } from "@/lib/services/orders";
import { ServiceError } from "@/lib/services/auth";
import { failure, type ActionResult } from "@/lib/action-result";
import type { OrderStatus, Role } from "@/prisma/generated/enums";

/**
 * Toda ação administrativa reconfere o papel do usuário. O layout de /admin já
 * barra, mas uma Server Action é um endpoint próprio: confiar só no layout
 * deixaria a ação acessível a quem soubesse chamá-la.
 */
async function comoAdmin<T>(fn: (adminId: string) => Promise<T>): Promise<ActionResult<T>> {
  const admin = await requireAdmin();
  try {
    const data = await fn(admin.id);
    return { ok: true, data } as ActionResult<T>;
  } catch (error) {
    if (error instanceof ServiceError) return failure(error.message, error.field);
    throw error;
  }
}

function revalidarCatalogo() {
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
}

// ───────────────────────────── Produtos ─────────────────────────────

export async function criarProduto(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return failure(issue.message, issue.path[0]?.toString());
  }

  const result = await comoAdmin(async (adminId) => {
    const produto = await createProduct(parsed.data, adminId);
    return { id: produto.id };
  });
  if (result.ok) revalidarCatalogo();
  return result;
}

export async function editarProduto(id: string, input: unknown): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return failure(issue.message, issue.path[0]?.toString());
  }

  const result = await comoAdmin((adminId) => updateProduct(id, parsed.data, adminId));
  if (result.ok) revalidarCatalogo();
  return result as ActionResult;
}

export async function alternarProduto(id: string, ativo: boolean): Promise<ActionResult> {
  const result = await comoAdmin(() => setProductActive(id, ativo));
  if (result.ok) revalidarCatalogo();
  return result as ActionResult;
}

export async function enviarImagem(
  productId: string,
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  const arquivo = formData.get("file");
  if (!(arquivo instanceof File)) return failure("Nenhum arquivo enviado.");

  const result = await comoAdmin(async () => {
    const url = await saveProductImage(arquivo);
    await addProductImage(productId, url, (formData.get("altText") as string) || undefined);
    return { url };
  });
  if (result.ok) revalidarCatalogo();
  return result;
}

export async function definirImagemPrincipal(productId: string, imageId: string) {
  const result = await comoAdmin(() => setPrimaryImage(productId, imageId));
  if (result.ok) revalidarCatalogo();
  return result as ActionResult;
}

export async function excluirImagem(imageId: string) {
  const result = await comoAdmin(() => deleteProductImage(imageId));
  if (result.ok) revalidarCatalogo();
  return result as ActionResult;
}

// ──────────────────────────── Categorias ────────────────────────────

export async function criarCategoria(input: unknown): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return failure(issue.message, issue.path[0]?.toString());
  }
  const result = await comoAdmin(async () => {
    await createCategory(parsed.data);
  });
  if (result.ok) revalidarCatalogo();
  return result as ActionResult;
}

export async function editarCategoria(id: string, input: unknown): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return failure(issue.message, issue.path[0]?.toString());
  }
  const result = await comoAdmin(async () => {
    await updateCategory(id, parsed.data);
  });
  if (result.ok) revalidarCatalogo();
  return result as ActionResult;
}

export async function excluirCategoria(id: string): Promise<ActionResult> {
  const result = await comoAdmin(() => deleteCategory(id));
  if (result.ok) revalidarCatalogo();
  return result as ActionResult;
}

// ─────────────────────────────── Marcas ─────────────────────────────

export async function criarMarca(input: unknown): Promise<ActionResult> {
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return failure(issue.message, issue.path[0]?.toString());
  }
  const result = await comoAdmin(async () => {
    await createBrand(parsed.data);
  });
  if (result.ok) revalidarCatalogo();
  return result as ActionResult;
}

export async function editarMarca(id: string, input: unknown): Promise<ActionResult> {
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return failure(issue.message, issue.path[0]?.toString());
  }
  const result = await comoAdmin(async () => {
    await updateBrand(id, parsed.data);
  });
  if (result.ok) revalidarCatalogo();
  return result as ActionResult;
}

export async function excluirMarca(id: string): Promise<ActionResult> {
  const result = await comoAdmin(() => deleteBrand(id));
  if (result.ok) revalidarCatalogo();
  return result as ActionResult;
}

// ───────────────────────────── Estoque ──────────────────────────────

export async function ajustarEstoque(input: unknown): Promise<ActionResult> {
  const parsed = stockAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return failure(issue.message, issue.path[0]?.toString());
  }
  const result = await comoAdmin((adminId) => adjustStock(parsed.data, adminId));
  if (result.ok) revalidarCatalogo();
  return result as ActionResult;
}

// ────────────────────────────── Pedidos ─────────────────────────────

export async function mudarStatusPedido(
  orderId: string,
  status: OrderStatus,
  nota?: string,
): Promise<ActionResult> {
  const result = await comoAdmin((adminId) => updateOrderStatus(orderId, status, adminId, nota));
  if (result.ok) {
    revalidatePath("/admin/pedidos");
    revalidatePath("/minha-conta/pedidos");
  }
  return result as ActionResult;
}

export async function cancelarPedidoAdmin(orderId: string, nota?: string): Promise<ActionResult> {
  const result = await comoAdmin((adminId) =>
    cancelOrder(orderId, adminId, nota ?? "Cancelado pelo administrador"),
  );
  if (result.ok) revalidarCatalogo();
  return result as ActionResult;
}

// ────────────────────────────── Usuários ────────────────────────────

export async function alternarUsuario(id: string, ativo: boolean): Promise<ActionResult> {
  const result = await comoAdmin((adminId) => setUserActive(id, ativo, adminId));
  if (result.ok) revalidatePath("/admin/usuarios");
  return result as ActionResult;
}

export async function mudarPapelUsuario(id: string, papel: Role): Promise<ActionResult> {
  const result = await comoAdmin((adminId) => setUserRole(id, papel, adminId));
  if (result.ok) revalidatePath("/admin/usuarios");
  return result as ActionResult;
}

// ─────────────────────────────── Cupons ─────────────────────────────

export async function criarCupom(input: unknown): Promise<ActionResult> {
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return failure(issue.message, issue.path[0]?.toString());
  }
  const result = await comoAdmin(async () => {
    await createCoupon(parsed.data);
  });
  if (result.ok) revalidatePath("/admin/cupons");
  return result as ActionResult;
}

export async function editarCupom(id: string, input: unknown): Promise<ActionResult> {
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return failure(issue.message, issue.path[0]?.toString());
  }
  const result = await comoAdmin(async () => {
    await updateCoupon(id, parsed.data);
  });
  if (result.ok) revalidatePath("/admin/cupons");
  return result as ActionResult;
}

export async function alternarCupom(id: string, ativo: boolean): Promise<ActionResult> {
  const result = await comoAdmin(() => setCouponActive(id, ativo));
  if (result.ok) revalidatePath("/admin/cupons");
  return result as ActionResult;
}

export async function excluirCupom(id: string): Promise<ActionResult> {
  const result = await comoAdmin(() => deleteCoupon(id));
  if (result.ok) revalidatePath("/admin/cupons");
  return result as ActionResult;
}
