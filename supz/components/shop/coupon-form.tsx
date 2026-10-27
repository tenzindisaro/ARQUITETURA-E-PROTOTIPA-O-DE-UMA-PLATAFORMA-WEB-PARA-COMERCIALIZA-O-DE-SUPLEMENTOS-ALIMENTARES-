"use client";

import { useState, useTransition } from "react";
import { Tag, X, Check } from "lucide-react";
import { toast } from "sonner";
import { aplicarCupom, removerCupom } from "@/app/(shop)/carrinho/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CouponForm({
  applied,
}: {
  applied: { code: string; description: string | null } | null;
}) {
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl bg-success/10 p-3">
        <div className="flex min-w-0 items-center gap-2">
          <Check className="size-4 shrink-0 text-success" />
          <div className="min-w-0">
            <p className="font-mono text-sm font-bold text-success">{applied.code}</p>
            {applied.description && (
              <p className="truncate text-xs text-muted-foreground">{applied.description}</p>
            )}
          </div>
        </div>
        <Button
          variant="ghost" size="icon" disabled={pendente}
          aria-label="Remover cupom"
          onClick={() =>
            startTransition(async () => {
              await removerCupom();
              toast.success("Cupom removido");
            })
          }
        >
          <X />
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        startTransition(async () => {
          const result = await aplicarCupom(codigo);
          if (result.ok) {
            setCodigo("");
            toast.success("Cupom aplicado");
          } else {
            setErro(result.message);
          }
        });
      }}
    >
      <label htmlFor="cupom" className="flex items-center gap-2 text-sm font-medium">
        <Tag className="size-4" /> Cupom de desconto
      </label>
      <div className="flex gap-2">
        <Input
          id="cupom"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="SUPZ10"
          className="font-mono uppercase"
          autoComplete="off"
        />
        <Button type="submit" variant="secondary" disabled={pendente || !codigo.trim()}>
          {pendente ? "..." : "Aplicar"}
        </Button>
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
    </form>
  );
}
