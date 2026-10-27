"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { mudarStatusPedido, cancelarPedidoAdmin } from "@/app/admin/actions";
import { STATUS_LABEL, NEXT_STATUS } from "@/lib/order-status";
import type { OrderStatus } from "@/prisma/generated/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Só os status permitidos a partir do atual aparecem — a mesma regra que o
 * serviço aplica no servidor (`NEXT_STATUS`).
 */
export function OrderStatusControl({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [nota, setNota] = useState("");
  const [pendente, startTransition] = useTransition();

  const proximos = NEXT_STATUS[status].filter((s) => s !== "CANCELLED");
  const podeCancelar = NEXT_STATUS[status].includes("CANCELLED" as OrderStatus);

  if (proximos.length === 0 && !podeCancelar) {
    return (
      <p className="text-sm text-muted-foreground">
        Este pedido está em um estado final: não há mais transições possíveis.
      </p>
    );
  }

  function avancar(novo: OrderStatus) {
    startTransition(async () => {
      const r = await mudarStatusPedido(orderId, novo, nota || undefined);
      if (r.ok) {
        toast.success(`Status alterado para “${STATUS_LABEL[novo]}”`);
        setNota("");
        router.refresh();
      } else {
        toast.error(r.message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="nota">Observação (opcional)</Label>
        <Input
          id="nota" value={nota} maxLength={160}
          placeholder="Ex.: código de rastreio BR123456789BR"
          onChange={(e) => setNota(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {proximos.map((s) => (
          <Button key={s} disabled={pendente} onClick={() => avancar(s)}>
            {STATUS_LABEL[s]}
          </Button>
        ))}

        {podeCancelar && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive" disabled={pendente}>
                Cancelar pedido
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar este pedido?</AlertDialogTitle>
                <AlertDialogDescription>
                  O estoque de todos os itens volta e o uso do cupom é devolvido.
                  A ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Manter</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    startTransition(async () => {
                      const r = await cancelarPedidoAdmin(orderId, nota || undefined);
                      if (r.ok) { toast.success("Pedido cancelado"); router.refresh(); }
                      else toast.error(r.message);
                    })
                  }
                >
                  Cancelar pedido
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
