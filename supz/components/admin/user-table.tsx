"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { alternarUsuario, mudarPapelUsuario } from "@/app/admin/actions";
import { Role } from "@/prisma/generated/enums";
import { formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface Usuario {
  id: string; name: string; email: string; cpf: string | null; phone: string | null;
  role: Role; isActive: boolean; createdAt: string;
  pedidos: number; avaliacoes: number; gasto: number;
}

export function UserTable({ users }: { users: Usuario[] }) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();

  return (
    <div className="rounded-2xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead className="text-right">Pedidos</TableHead>
            <TableHead className="text-right">Total gasto</TableHead>
            <TableHead>Perfil</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-28"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                Nenhum usuário encontrado.
              </TableCell>
            </TableRow>
          ) : (
            users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Desde {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                    {u.cpf && ` · CPF ${u.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}`}
                  </p>
                </TableCell>
                <TableCell>
                  <p className="text-sm">{u.email}</p>
                  {u.phone && <p className="text-xs text-muted-foreground">{u.phone}</p>}
                </TableCell>
                <TableCell className="text-right">{u.pedidos}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatPrice(u.gasto)}
                </TableCell>
                <TableCell>
                  <Select
                    value={u.role}
                    disabled={pendente}
                    onValueChange={(v) =>
                      startTransition(async () => {
                        const r = await mudarPapelUsuario(u.id, v as Role);
                        if (r.ok) { toast.success("Perfil atualizado"); router.refresh(); }
                        else toast.error(r.message);
                      })
                    }
                  >
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CUSTOMER">Cliente</SelectItem>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge variant={u.isActive ? "default" : "secondary"}>
                    {u.isActive ? "ativo" : "desativado"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost" size="sm" disabled={pendente}
                    className={u.isActive ? "text-destructive" : ""}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await alternarUsuario(u.id, !u.isActive);
                        if (r.ok) {
                          toast.success(u.isActive ? "Usuário desativado" : "Usuário reativado");
                          router.refresh();
                        } else {
                          toast.error(r.message);
                        }
                      })
                    }
                  >
                    {u.isActive ? "Desativar" : "Reativar"}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
