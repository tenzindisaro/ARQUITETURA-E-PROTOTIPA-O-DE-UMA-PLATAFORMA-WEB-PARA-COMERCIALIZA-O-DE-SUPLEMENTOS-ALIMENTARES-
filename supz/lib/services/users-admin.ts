import "server-only";
import { db } from "@/lib/db";
import { Role } from "@/prisma/generated/enums";
import { ServiceError } from "@/lib/services/auth";

export async function listUsers(q?: string) {
  return db.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { cpf: { contains: q.replace(/\D/g, "") } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { orders: true, reviews: true } },
    },
  });
}

export async function getUserDetail(id: string) {
  return db.user.findUnique({
    where: { id },
    include: {
      addresses: true,
      orders: {
        orderBy: { createdAt: "desc" },
        select: { id: true, number: true, status: true, total: true, createdAt: true },
      },
    },
  });
}

export async function setUserActive(id: string, isActive: boolean, actingAdminId: string) {
  if (id === actingAdminId && !isActive) {
    throw new ServiceError("Você não pode desativar a própria conta.");
  }
  await db.user.update({ where: { id }, data: { isActive } });
}

export async function setUserRole(id: string, role: Role, actingAdminId: string) {
  if (id === actingAdminId && role !== Role.ADMIN) {
    throw new ServiceError("Você não pode remover o próprio acesso de administrador.");
  }

  // A loja não pode ficar sem nenhum administrador.
  if (role !== Role.ADMIN) {
    const outrosAdmins = await db.user.count({
      where: { role: Role.ADMIN, isActive: true, id: { not: id } },
    });
    if (outrosAdmins === 0) {
      throw new ServiceError("É preciso manter ao menos um administrador ativo.");
    }
  }

  await db.user.update({ where: { id }, data: { role } });
}
