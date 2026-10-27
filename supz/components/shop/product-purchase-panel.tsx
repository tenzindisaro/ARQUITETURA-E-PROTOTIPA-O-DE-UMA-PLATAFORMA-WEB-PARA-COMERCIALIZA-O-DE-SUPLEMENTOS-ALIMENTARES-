"use client";

import { useState } from "react";
import { Minus, Plus, TriangleAlert } from "lucide-react";
import { resolvePrice } from "@/lib/pricing";
import { formatPrice } from "@/lib/format";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Variante {
  id: string;
  name: string;
  sku: string;
  stock: number;
  priceDelta: number;
}

/**
 * A escolha do sabor muda o preço (via `priceDelta`) e o estoque, então o painel
 * inteiro é cliente. O cálculo usa a mesma `resolvePrice` do servidor.
 */
export function ProductPurchasePanel({
  variants,
  price,
  salePrice,
  flashPrice,
  productName,
}: {
  variants: Variante[];
  price: number;
  salePrice: number | null;
  flashPrice: number | null;
  productName: string;
}) {
  const primeiraDisponivel = variants.find((v) => v.stock > 0) ?? variants[0];
  const [variante, setVariante] = useState(primeiraDisponivel);
  const [quantidade, setQuantidade] = useState(1);

  const preco = resolvePrice({
    price,
    salePrice,
    flashPrice,
    priceDelta: variante?.priceDelta ?? 0,
  });

  const maximo = Math.min(variante?.stock ?? 0, 10);
  const esgotado = (variante?.stock ?? 0) === 0;

  return (
    <div className="space-y-5">
      <div>
        {preco.hasDiscount && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(preco.listPrice)}
            </span>
            <Badge className="bg-destructive text-destructive-foreground">
              -{preco.discountPercent}%
            </Badge>
            {preco.isFlash && (
              <Badge className="bg-accent text-accent-foreground">FLASH SALE</Badge>
            )}
          </div>
        )}
        <p className="text-4xl font-black text-primary">{formatPrice(preco.currentPrice)}</p>
        <p className="mt-1 text-sm font-medium text-success">
          ou 12x de {formatPrice(preco.currentPrice / 12)} sem juros
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          À vista no Pix com desconto já aplicado
        </p>
      </div>

      {variants.length > 1 && (
        <div className="space-y-2">
          <Label>Sabor</Label>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={v.stock === 0}
                onClick={() => {
                  setVariante(v);
                  setQuantidade(1);
                }}
                className={cn(
                  "rounded-xl border px-4 py-2 text-sm font-medium transition-all",
                  v.id === variante?.id
                    ? "border-primary bg-primary/5 text-primary"
                    : "hover:border-primary/50",
                  v.stock === 0 && "cursor-not-allowed opacity-40 line-through",
                )}
              >
                {v.name}
                {v.priceDelta > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    +{formatPrice(v.priceDelta)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Quantidade</Label>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border">
            <Button
              variant="ghost" size="icon" disabled={quantidade <= 1 || esgotado}
              onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
              aria-label="Diminuir quantidade"
            >
              <Minus />
            </Button>
            <span className="w-10 text-center font-bold tabular-nums">{quantidade}</span>
            <Button
              variant="ghost" size="icon" disabled={quantidade >= maximo || esgotado}
              onClick={() => setQuantidade((q) => Math.min(maximo, q + 1))}
              aria-label="Aumentar quantidade"
            >
              <Plus />
            </Button>
          </div>

          {!esgotado && variante && variante.stock <= 5 && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-accent-hover">
              <TriangleAlert className="size-4" />
              Restam {variante.stock} unidade{variante.stock === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      <AddToCartButton
        variants={variants}
        selectedVariantId={variante?.id}
        productName={`${productName}${variants.length > 1 ? ` — ${variante?.name}` : ""}`}
        quantity={quantidade}
        size="lg"
      />

      {variante && (
        <p className="text-xs text-muted-foreground">
          SKU {variante.sku} · {esgotado ? "Indisponível" : `${variante.stock} em estoque`}
        </p>
      )}
    </div>
  );
}
