import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Carrinho de visitante: um token opaco em cookie httpOnly. Só isso identifica
 * o convidado — não há nada de pessoal no cookie, e no login o carrinho é
 * mesclado ao do usuário e descartado.
 */
export const CART_COOKIE = "supz_cart";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
  secure: process.env.NODE_ENV === "production",
} as const;

/** Leitura — funciona em qualquer contexto de servidor. */
export async function readCartToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value ?? null;
}

/** Escrita — só em Server Action ou Route Handler. */
export async function writeCartToken(token: string) {
  const store = await cookies();
  store.set(CART_COOKIE, token, COOKIE_OPTIONS);
}

export async function clearCartToken() {
  const store = await cookies();
  store.delete(CART_COOKIE);
}

export function newCartToken() {
  return randomBytes(24).toString("hex");
}
