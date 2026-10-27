import type { Metadata } from "next";
import { listUsers } from "@/lib/services/users-admin";
import { db } from "@/lib/db";
import { UserTable } from "@/components/admin/user-table";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Usuários" };

export default async function Page(props: PageProps<"/admin/usuarios">) {
  const raw = await props.searchParams;
  const q = typeof raw.q === "string" ? raw.q : undefined;

  const usuarios = await listUsers(q);

  // Total gasto por cliente, ignorando pedidos cancelados.
  const gastos = await db.order.groupBy({
    by: ["userId"],
    where: { status: { not: "CANCELLED" } },
    _sum: { total: true },
  });
  const porUsuario = new Map(gastos.map((g) => [g.userId, Number(g._sum.total ?? 0)]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Usuários</h1>
        <p className="text-muted-foreground">{usuarios.length} contas cadastradas</p>
      </div>

      <form className="max-w-sm">
        <Input name="q" defaultValue={q} placeholder="Buscar por nome, e-mail ou CPF..." />
      </form>

      <UserTable
        users={usuarios.map((u) => ({
          id: u.id, name: u.name, email: u.email, cpf: u.cpf, phone: u.phone,
          role: u.role, isActive: u.isActive, createdAt: u.createdAt.toISOString(),
          pedidos: u._count.orders, avaliacoes: u._count.reviews,
          gasto: porUsuario.get(u.id) ?? 0,
        }))}
      />
    </div>
  );
}
