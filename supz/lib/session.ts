import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/current-user";
import { Role } from "@/prisma/generated/enums";

export { getCurrentUser };

/**
 * Sessão do token, sem conferir o banco. Serve só para exibição (nome no
 * cabeçalho, link "Entrar" vs "Minha conta"). Nunca use para autorizar.
 */
export async function getSession() {
  return auth();
}

/**
 * Exige um usuário autenticado e válido. Esta é a verificação que vale — o
 * `proxy.ts` faz apenas um redirect otimista pelo cookie e não pode ser a
 * única barreira.
 */
export async function requireUser(callbackUrl?: string) {
  const user = await getCurrentUser();
  if (!user) {
    const target = callbackUrl
      ? `/entrar?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/entrar";
    redirect(target);
  }
  return user;
}

/** Exige perfil de administrador. Usada no layout de /admin e nos services. */
export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== Role.ADMIN) {
    // Cliente autenticado que tenta /admin não descobre que a rota existe.
    redirect("/");
  }
  return user;
}
