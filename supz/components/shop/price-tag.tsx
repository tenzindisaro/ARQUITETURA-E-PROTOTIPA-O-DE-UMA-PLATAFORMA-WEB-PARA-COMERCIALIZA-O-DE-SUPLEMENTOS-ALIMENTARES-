import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PriceTag({
  listPrice,
  currentPrice,
  hasDiscount,
  size = "md",
  showInstallments = true,
  className,
}: {
  listPrice: number;
  currentPrice: number;
  hasDiscount: boolean;
  size?: "sm" | "md" | "lg";
  showInstallments?: boolean;
  className?: string;
}) {
  const priceClass = { sm: "text-base", md: "text-xl", lg: "text-3xl" }[size];

  return (
    <div className={className}>
      {hasDiscount && (
        <span className="text-xs text-muted-foreground line-through">
          {formatPrice(listPrice)}
        </span>
      )}
      <p className={cn("font-black text-primary", priceClass)}>{formatPrice(currentPrice)}</p>
      {showInstallments && currentPrice >= 12 && (
        <p className="text-xs font-medium text-success">
          ou 12x de {formatPrice(currentPrice / 12)} sem juros
        </p>
      )}
    </div>
  );
}
