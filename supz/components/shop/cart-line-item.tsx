"use client";

import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { Minus, Plus, Trash2, TriangleAlert, Package } from "lucide-react";
import { toast } from "sonner";
import { alterarQuantidade, removerDoCarrinho } from "@/app/(shop)/carrinho/actions";
import type { CartLine } from "@/lib/services/cart";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function CartLineItem({ line }: { line: CartLine }) {
  const [pendente, startTransition] = useTransition();

  function mudarQuantidade(nova: number) {
    startTransition(async () => {
      const result = await alterarQuantidade(line.itemId, nova);
      if (!result.ok) toast.error(result.message);
    });
  }

  function remover() {
    startTransition(async () => {
      const result = await removerDoCarrinho(line.itemId);
      if (result.ok) toast.success("Item removido do carrinho");
      else toast.error(result.message);
    });
  }

  return (
    <li className="flex gap-4 py-5" data-pending={pendente || undefined}>
      <Link
        href={`/produtos/${line.productSlug}`}
        className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-surface"
      >
        {line.imageUrl ? (
          <Image src={line.imageUrl} alt={line.productName} fill sizes="96px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="size-6 text-muted-foreground/30" />
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {line.brandName}
            </p>
            <Link
              href={`/produtos/${line.productSlug}`}
              className="line-clamp-2 text-sm font-bold leading-tight hover:text-primary"
            >
              {line.productName}
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Sabor: {line.variantName} · SKU {line.sku}
            </p>
          </div>

          <Button
            variant="ghost" size="icon" onClick={remover} disabled={pendente}
            aria-label={`Remover ${line.productName} do carrinho`}
          >
            <Trash2 className="text-destructive" />
          </Button>
        </div>

        {line.exceedsStock && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
            <TriangleAlert className="size-3.5" />
            Restam apenas {line.stock} em estoque — ajuste a quantidade
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center rounded-xl border">
            <Button
              variant="ghost" size="icon" disabled={pendente || line.quantity <= 1}
              onClick={() => mudarQuantidade(line.quantity - 1)}
              aria-label="Diminuir quantidade"
            >
              <Minus />
            </Button>
            <span className="w-10 text-center text-sm font-bold tabular-nums">
              {line.quantity}
            </span>
            <Button
              variant="ghost" size="icon"
              disabled={pendente || line.quantity >= line.stock}
              onClick={() => mudarQuantidade(line.quantity + 1)}
              aria-label="Aumentar quantidade"
            >
              <Plus />
            </Button>
          </div>

          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              {line.isFlash && (
                <Badge className="bg-accent text-accent-foreground">FLASH</Badge>
              )}
              {line.hasDiscount && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(line.listPrice)}
                </span>
              )}
            </div>
            <p className="font-black text-primary">{formatPrice(line.lineTotal)}</p>
            {line.quantity > 1 && (
              <p className="text-xs text-muted-foreground">
                {formatPrice(line.unitPrice)} cada
              </p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
