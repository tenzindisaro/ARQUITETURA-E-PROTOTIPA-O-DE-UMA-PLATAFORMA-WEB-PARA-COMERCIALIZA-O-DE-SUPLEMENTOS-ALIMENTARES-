"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export function SearchInput({
  className,
  autoFocus,
}: {
  className?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [valor, setValor] = useState(searchParams.get("q") ?? "");

  return (
    <form
      role="search"
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const termo = valor.trim();
        // A busca vive na URL: recarregável, compartilhável e lida direto
        // pelo Server Component, sem fetch no cliente.
        router.push(termo ? `/produtos?q=${encodeURIComponent(termo)}` : "/produtos");
      }}
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          name="q"
          autoFocus={autoFocus}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Buscar suplementos..."
          aria-label="Buscar suplementos"
          className="w-full rounded-xl bg-secondary py-2 pl-9 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
        />
      </div>
    </form>
  );
}
