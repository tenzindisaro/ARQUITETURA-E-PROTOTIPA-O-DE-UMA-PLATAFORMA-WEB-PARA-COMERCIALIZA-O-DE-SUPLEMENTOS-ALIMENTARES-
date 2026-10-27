"use client";

import { useState, useTransition } from "react";
import { Gift, Check } from "lucide-react";
import { assinarNewsletter } from "@/app/(shop)/actions";
import { Button } from "@/components/ui/button";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [cupom, setCupom] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  if (cupom) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-success/20">
          <Check className="size-6 text-success" />
        </div>
        <p className="text-xl font-black">Pronto! Seu desconto está liberado.</p>
        <p className="text-white/60">
          Use o cupom{" "}
          <span className="rounded-lg bg-accent px-2 py-1 font-mono font-bold text-accent-foreground">
            {cupom}
          </span>{" "}
          no carrinho e ganhe 10% OFF na primeira compra.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium">
        <Gift className="size-4 text-accent" />
        Oferta de boas-vindas
      </div>
      <h2 className="text-3xl font-black">Ganhe 10% OFF na primeira compra</h2>
      <p className="max-w-lg text-white/60">
        Cadastre seu e-mail e receba ofertas exclusivas, lançamentos e conteúdos
        sobre suplementação.
      </p>

      <form
        className="flex w-full max-w-md flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          setErro(null);
          startTransition(async () => {
            const result = await assinarNewsletter(email);
            if (result.ok) setCupom(result.data.coupon);
            else setErro(result.message);
          });
        }}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Digite seu e-mail"
          aria-label="Seu e-mail"
          className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm text-white outline-none ring-1 ring-white/20 placeholder:text-white/40 focus:ring-2 focus:ring-accent"
        />
        <Button
          type="submit"
          disabled={pendente}
          className="bg-accent font-bold text-accent-foreground hover:bg-accent-hover"
        >
          {pendente ? "Enviando..." : "Quero meu desconto"}
        </Button>
      </form>

      {erro && <p className="text-sm text-destructive">{erro}</p>}
    </div>
  );
}
