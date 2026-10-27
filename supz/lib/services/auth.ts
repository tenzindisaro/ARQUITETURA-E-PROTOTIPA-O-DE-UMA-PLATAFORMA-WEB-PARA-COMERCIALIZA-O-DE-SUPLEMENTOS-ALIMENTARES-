import "server-only";
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { Role } from "@/prisma/generated/enums";
import type { RegisterInput } from "@/lib/validations/auth";

const BCRYPT_ROUNDS = 10;
const RESET_TOKEN_TTL_MINUTES = 30;

export class ServiceError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** O token vai por e-mail/link; no banco fica apenas o hash. */
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function registerCustomer(input: RegisterInput) {
  const [emailTaken, cpfTaken] = await Promise.all([
    db.user.findUnique({ where: { email: input.email }, select: { id: true } }),
    db.user.findUnique({ where: { cpf: input.cpf }, select: { id: true } }),
  ]);

  if (emailTaken) throw new ServiceError("Este e-mail já está cadastrado", "email");
  if (cpfTaken) throw new ServiceError("Este CPF já está cadastrado", "cpf");

  return db.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      cpf: input.cpf,
      passwordHash: await hashPassword(input.password),
      role: Role.CUSTOMER,
    },
    select: { id: true, name: true, email: true, role: true },
  });
}

/**
 * Cria um token de recuperação. Devolve o token em claro para quem chamou —
 * neste projeto não há serviço de e-mail, então o link é exibido na tela.
 * Numa aplicação real, este retorno iria para o provedor de e-mail e nunca
 * chegaria ao navegador.
 */
export async function createPasswordResetToken(email: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, isActive: true },
  });

  // Conta inexistente ou desativada não revela nada a quem pediu.
  if (!user || !user.isActive) return null;

  // Invalida pedidos anteriores ainda abertos.
  await db.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(32).toString("hex");

  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
    },
  });

  return token;
}

export async function resetPassword(token: string, newPassword: string) {
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, isActive: true } } },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ServiceError("Link inválido ou expirado. Solicite um novo.", "token");
  }
  if (!record.user.isActive) {
    throw new ServiceError("Esta conta está desativada.", "token");
  }

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(newPassword) },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);
}

/** Usado pelo provider de credenciais do Auth.js. */
export async function authenticate(email: string, password: string) {
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      passwordHash: true,
    },
  });

  // Comparação mesmo sem usuário, para não vazar quais e-mails existem pelo
  // tempo de resposta.
  const hash =
    user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
  const ok = await verifyPassword(password, hash);

  if (!user || !ok || !user.isActive) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
