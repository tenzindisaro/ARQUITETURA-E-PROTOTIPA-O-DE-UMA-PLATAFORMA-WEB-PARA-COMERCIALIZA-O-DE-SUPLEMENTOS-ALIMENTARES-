"use server";

import { emailSchema } from "@/lib/validations/auth";
import { subscribe } from "@/lib/services/newsletter";
import { failure, type ActionResult } from "@/lib/action-result";

export async function assinarNewsletter(
  email: unknown,
): Promise<ActionResult<{ coupon: string }>> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return failure("Informe um e-mail válido.", "email");

  const coupon = await subscribe(parsed.data);
  return { ok: true, data: { coupon } };
}
