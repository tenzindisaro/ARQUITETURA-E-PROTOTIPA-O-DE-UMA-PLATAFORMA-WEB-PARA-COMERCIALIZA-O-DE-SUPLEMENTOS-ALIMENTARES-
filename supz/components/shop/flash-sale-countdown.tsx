"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Conta o tempo até `endsAt`. O valor inicial é `null` de propósito: servidor e
 * cliente nunca leem o relógio no mesmo instante, e calcular no primeiro render
 * quebraria a hidratação. O contador só começa depois de montado.
 *
 * Quando zera, o preço promocional já deixou de valer do lado do servidor — a
 * consulta filtra pela janela da promoção, sem depender deste componente.
 */
export function FlashSaleCountdown({ endsAt }: { endsAt: string }) {
  const [restante, setRestante] = useState<number | null>(null);

  useEffect(() => {
    const alvo = new Date(endsAt).getTime();
    const atualizar = () => setRestante(Math.max(0, alvo - Date.now()));

    atualizar();
    const timer = setInterval(atualizar, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  if (restante === null) {
    // Reserva o espaço do contador para não deslocar o layout ao montar.
    return (
      <div className="flex items-center gap-2" aria-hidden>
        <Clock className="size-4 text-accent" />
        <span className="mr-1 text-sm text-white/60">Termina em:</span>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="rounded-xl bg-primary px-3 py-1.5">
              <span className="font-mono text-xl font-bold tabular-nums text-white">--</span>
            </div>
            {i < 2 && <span className="text-xl font-bold text-accent">:</span>}
          </div>
        ))}
      </div>
    );
  }

  if (restante <= 0) {
    return (
      <span className="rounded-xl bg-white/10 px-3 py-1.5 text-sm font-semibold text-white/70">
        Promoção encerrada
      </span>
    );
  }

  const h = Math.floor(restante / 3_600_000);
  const m = Math.floor((restante % 3_600_000) / 60_000);
  const s = Math.floor((restante % 60_000) / 1000);

  return (
    <div className="flex items-center gap-2">
      <Clock className="size-4 text-accent" />
      <span className="mr-1 text-sm text-white/60">Termina em:</span>
      {[h, m, s].map((unidade, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="rounded-xl bg-primary px-3 py-1.5">
            <span className="font-mono text-xl font-bold tabular-nums text-white">
              {pad(unidade)}
            </span>
          </div>
          {i < 2 && <span className="text-xl font-bold text-accent">:</span>}
        </div>
      ))}
    </div>
  );
}
