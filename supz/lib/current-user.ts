import "server-only";
import { db } from "@/lib/db";
import type { Role } from "@/prisma/generated/enums";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/**
 * Usuário autenticado, conferido contra o banco — não apenas contra o JWT.
 *
 * O token carrega id e papel de quando o login aconteceu e vale 30 dias. Sem
 * esta conferência, um usuário desativado ou rebaixado continuaria trabalhando
 * com as permissões antigas até o token vencer, e uma conta apagada deixaria
 * a sessão apontando para um id inexistente.
 *
 * Devolve null quando não há sessão, quando o usuário sumiu do banco ou quando
 * foi desativado.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
