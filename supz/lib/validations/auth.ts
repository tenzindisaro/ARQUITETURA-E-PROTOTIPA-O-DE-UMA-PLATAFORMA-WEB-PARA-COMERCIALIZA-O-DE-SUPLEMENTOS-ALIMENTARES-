import { z } from "zod";

// Os mesmos schemas rodam no formulário (React Hook Form) e no servidor
// (Server Action). O cliente valida para dar feedback; o servidor valida
// porque é o único lado em que se pode confiar.

/** Remove máscara, deixando só dígitos. */
const digits = (v: string) => v.replace(/\D/g, "");

/** Validação de CPF pelos dois dígitos verificadores. */
export function isValidCpf(raw: string): boolean {
  const cpf = digits(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  for (const [length, position] of [
    [9, 10],
    [10, 11],
  ]) {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += Number(cpf[i]) * (position - i);
    }
    const check = (sum * 10) % 11 % 10;
    if (check !== Number(cpf[length])) return false;
  }
  return true;
}

/**
 * Normaliza antes de validar: `z.email()` checa o formato na entrada crua, então
 * um espaço colado no fim do campo recusaria um e-mail perfeitamente válido.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("E-mail inválido"));

export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter ao menos 8 caracteres")
  .max(72, "A senha deve ter no máximo 72 caracteres")
  .regex(/[a-zA-Z]/, "A senha deve conter ao menos uma letra")
  .regex(/[0-9]/, "A senha deve conter ao menos um número");

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Informe seu nome completo")
      .max(120, "Nome muito longo"),
    email: emailSchema,
    phone: z
      .string()
      .trim()
      .refine((v) => digits(v).length >= 10 && digits(v).length <= 11, {
        message: "Telefone inválido — informe DDD e número",
      })
      .transform(digits),
    cpf: z
      .string()
      .trim()
      .refine(isValidCpf, { message: "CPF inválido" })
      .transform(digits),
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "As senhas não conferem",
    path: ["passwordConfirmation"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token ausente"),
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "As senhas não conferem",
    path: ["passwordConfirmation"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
