"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCartUi } from "@/stores/cart-ui";

/**
 * O número vem do servidor; o store do Zustand só permite sobrepor com um valor
 * otimista logo após adicionar um item, antes da revalidação chegar.
 */
export function CartBadge({ count }: { count: number }) {
  const otimista = useCartUi((s) => s.optimisticCount);
  const total = otimista ?? count;

  return (
    <Link
      href="/carrinho"
      className="relative flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-primary-foreground transition-colors hover:bg-primary-hover"
    >
      <ShoppingCart className="size-4" />
      <span className="hidden text-sm font-semibold sm:block">Carrinho</span>
      {total > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
          {total > 99 ? "99+" : total}
        </span>
      )}
      <span className="sr-only">{total} itens no carrinho</span>
    </Link>
  );
}
