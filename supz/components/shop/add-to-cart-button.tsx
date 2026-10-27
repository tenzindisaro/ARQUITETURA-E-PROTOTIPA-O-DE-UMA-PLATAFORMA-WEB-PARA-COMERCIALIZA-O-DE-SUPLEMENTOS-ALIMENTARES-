"use client";

import { useState, useTransition } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";
import { adicionarAoCarrinho } from "@/app/(shop)/carrinho/actions";
import { useCartUi } from "@/stores/cart-ui";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Variant {
  id: string;
  name: string;
  stock: number;
  priceDelta: number;
}

export function AddToCartButton({
  variants,
  productName,
  quantity = 1,
  className,
  size = "default",
  showVariantSelect = false,
  selectedVariantId,
}: {
  variants: Variant[];
  productName: string;
  quantity?: number;
  className?: string;
  size?: "sm" | "default" | "lg";
  showVariantSelect?: boolean;
  selectedVariantId?: string;
}) {
  const disponiveis = variants.filter((v) => v.stock > 0);
  const [escolhida, setEscolhida] = useState(
    selectedVariantId ?? disponiveis[0]?.id ?? "",
  );
  const [adicionado, setAdicionado] = useState(false);
  const [pendente, startTransition] = useTransition();
  const setOptimisticCount = useCartUi((s) => s.setOptimisticCount);

  const variantId = selectedVariantId ?? escolhida;
  const esgotado = disponiveis.length === 0;

  function adicionar() {
    if (!variantId) return;
    startTransition(async () => {
      const result = await adicionarAoCarrinho(variantId, quantity);
      if (result.ok) {
        setAdicionado(true);
        setOptimisticCount(null);
        toast.success("Adicionado ao carrinho", { description: productName });
        setTimeout(() => setAdicionado(false), 2000);
      } else {
        toast.error("Não foi possível adicionar", { description: result.message });
      }
    });
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showVariantSelect && variants.length > 1 && (
        <Select value={escolhida} onValueChange={setEscolhida}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Escolha o sabor" />
          </SelectTrigger>
          <SelectContent>
            {variants.map((v) => (
              <SelectItem key={v.id} value={v.id} disabled={v.stock === 0}>
                {v.name}
                {v.stock === 0 ? " — esgotado" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button
        onClick={adicionar}
        disabled={esgotado || pendente || !variantId}
        size={size}
        className="w-full font-bold"
      >
        {esgotado ? (
          "Esgotado"
        ) : adicionado ? (
          <>
            <Check /> Adicionado
          </>
        ) : (
          <>
            <ShoppingCart />
            <span className="truncate">
              {pendente
                ? "Adicionando..."
                : size === "sm"
                  ? "Adicionar"
                  : "Adicionar ao carrinho"}
            </span>
          </>
        )}
      </Button>
    </div>
  );
}
