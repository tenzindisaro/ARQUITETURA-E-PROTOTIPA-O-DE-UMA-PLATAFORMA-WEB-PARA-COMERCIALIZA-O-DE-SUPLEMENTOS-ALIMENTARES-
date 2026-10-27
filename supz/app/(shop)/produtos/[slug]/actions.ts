"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { upsertReview } from "@/lib/services/reviews";
import { ServiceError } from "@/lib/services/auth";
import { failure, type ActionResult } from "@/lib/action-result";
// O schema vive em lib/validations: um arquivo "use server" só pode exportar
// funções assíncronas, e exportar um objeto daqui quebra em tempo de execução.
import { reviewSchema } from "@/lib/validations/review";

export async function avaliarProduto(input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return failure(issue.message, issue.path[0]?.toString());
  }

  try {
    await upsertReview(user.id, parsed.data);
  } catch (error) {
    if (error instanceof ServiceError) return failure(error.message);
    throw error;
  }

  revalidatePath("/produtos", "page");
  return { ok: true };
}
