"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
import {
  registerCustomer,
  createPasswordResetToken,
  resetPassword,
  ServiceError,
} from "@/lib/services/auth";
import { failure, type ActionResult } from "@/lib/action-result";

export async function cadastrar(input: unknown): Promise<ActionResult> {
  // Revalidação no servidor: o schema do cliente serve para feedback, não
  // para confiança.
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return failure(issue.message, issue.path[0]?.toString());
  }

  try {
    await registerCustomer(parsed.data);
  } catch (error) {
    if (error instanceof ServiceError) return failure(error.message, error.field);
    throw error;
  }

  // Autentica direto após o cadastro, para o cliente não ter de digitar de novo.
  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/minha-conta",
  });

  return { ok: true };
}

export async function entrar(input: unknown, callbackUrl?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return failure("E-mail ou senha inválidos");
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/minha-conta",
    });
  } catch (error) {
    // signIn lança um redirect em caso de sucesso; só tratamos AuthError.
    if (error instanceof AuthError) {
      return failure("E-mail ou senha incorretos");
    }
    throw error;
  }

  return { ok: true };
}

export async function sair() {
  await signOut({ redirectTo: "/" });
}

/**
 * Não há serviço de e-mail neste projeto, então o link de redefinição é
 * devolvido para ser exibido na tela. Numa aplicação real este valor iria
 * para o provedor de e-mail e jamais chegaria ao navegador.
 */
export async function solicitarRecuperacao(
  input: unknown,
): Promise<ActionResult<{ link: string | null }>> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return failure("E-mail inválido", "email");
  }

  const token = await createPasswordResetToken(parsed.data.email);

  // A resposta é a mesma exista ou não a conta, para não revelar cadastros.
  return {
    ok: true,
    data: { link: token ? `/redefinir-senha?token=${token}` : null },
  };
}

export async function redefinirSenha(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return failure(issue.message, issue.path[0]?.toString());
  }

  try {
    await resetPassword(parsed.data.token, parsed.data.password);
  } catch (error) {
    if (error instanceof ServiceError) return failure(error.message, error.field);
    throw error;
  }

  return { ok: true };
}
