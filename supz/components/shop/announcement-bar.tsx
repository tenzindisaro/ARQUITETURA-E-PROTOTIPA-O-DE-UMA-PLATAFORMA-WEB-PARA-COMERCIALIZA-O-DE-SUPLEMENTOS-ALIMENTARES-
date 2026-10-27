"use client";

import { useEffect, useState } from "react";

const MENSAGENS = [
  "🚚 Frete grátis em compras acima de R$ 299",
  "⚡ Parcelamento em até 12x sem juros",
  "🏆 Mais de 50.000 clientes satisfeitos",
];

export function AnnouncementBar() {
  const [atual, setAtual] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setAtual((c) => (c + 1) % MENSAGENS.length), 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-primary py-2.5 text-center text-sm font-medium tracking-wide text-primary-foreground">
      {MENSAGENS[atual]}
    </div>
  );
}
