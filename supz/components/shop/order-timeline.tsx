import { Check, Circle, X, TriangleAlert } from "lucide-react";
import { STATUS_LABEL } from "@/lib/order-status";
import type { OrderStatus } from "@/prisma/generated/enums";

interface Evento {
  id: string;
  status: OrderStatus;
  note: string | null;
  createdAt: Date;
}

/**
 * Um evento que repete o status do anterior não é um avanço — é informativo
 * (uma tentativa de pagamento recusada, por exemplo). Mostrar um ✓ verde nele
 * daria a entender que algo deu certo.
 */
function tipoDoEvento(eventos: Evento[], i: number) {
  if (eventos[i].status === "CANCELLED") return "negativo" as const;
  if (i > 0 && eventos[i].status === eventos[i - 1].status) return "informativo" as const;
  return "avanco" as const;
}

export function OrderTimeline({
  events,
  showNext = true,
}: {
  events: Evento[];
  showNext?: boolean;
}) {
  const ultimo = events[events.length - 1];
  const finalizado = ultimo?.status === "DELIVERED" || ultimo?.status === "CANCELLED";

  return (
    <ol className="space-y-4">
      {events.map((evento, i) => {
        const tipo = tipoDoEvento(events, i);
        const ehUltimo = i === events.length - 1;

        return (
          <li key={evento.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={
                  tipo === "negativo"
                    ? "flex size-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                    : tipo === "informativo"
                      ? "flex size-7 items-center justify-center rounded-full bg-accent/20 text-accent-hover"
                      : "flex size-7 items-center justify-center rounded-full bg-success text-white"
                }
              >
                {tipo === "negativo" ? (
                  <X className="size-4" />
                ) : tipo === "informativo" ? (
                  <TriangleAlert className="size-4" />
                ) : (
                  <Check className="size-4" />
                )}
              </span>
              {(!ehUltimo || (showNext && !finalizado)) && (
                <span className="mt-1 w-px flex-1 bg-border" />
              )}
            </div>

            <div className="pb-1">
              <p
                className={
                  tipo === "informativo"
                    ? "text-sm font-semibold text-accent-hover"
                    : "text-sm font-semibold"
                }
              >
                {evento.note ?? STATUS_LABEL[evento.status]}
              </p>
              <p className="text-xs text-muted-foreground">
                {evento.createdAt.toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </li>
        );
      })}

      {showNext && !finalizado && (
        <li className="flex gap-3 opacity-40">
          <span className="flex size-7 items-center justify-center rounded-full border-2 border-dashed">
            <Circle className="size-3" />
          </span>
          <p className="text-sm">Próxima etapa</p>
        </li>
      )}
    </ol>
  );
}
