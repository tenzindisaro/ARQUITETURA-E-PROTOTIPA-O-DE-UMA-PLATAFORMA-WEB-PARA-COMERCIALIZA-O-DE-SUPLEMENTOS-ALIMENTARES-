import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  rating,
  size = "sm",
  className,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sz = { sm: "size-3.5", md: "size-4", lg: "size-5" }[size];

  return (
    <div className={cn("flex gap-0.5", className)} aria-label={`Nota ${rating} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          className={cn(
            sz,
            i <= Math.round(rating)
              ? "fill-accent text-accent"
              : "fill-muted text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}
