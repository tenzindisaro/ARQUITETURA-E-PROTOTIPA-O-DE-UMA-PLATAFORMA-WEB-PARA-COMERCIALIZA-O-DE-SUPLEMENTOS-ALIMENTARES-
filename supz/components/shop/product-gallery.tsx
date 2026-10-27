"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface Imagem { id: string; url: string; altText: string | null }

export function ProductGallery({ images, name }: { images: Imagem[]; name: string }) {
  const [ativa, setAtiva] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-surface">
        <Package className="size-16 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-surface">
        <Image
          src={images[ativa].url}
          alt={images[ativa].altText ?? name}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setAtiva(i)}
              aria-label={`Ver imagem ${i + 1} de ${images.length}`}
              aria-current={i === ativa}
              className={cn(
                "relative size-20 shrink-0 overflow-hidden rounded-xl bg-surface ring-2 transition-all",
                i === ativa ? "ring-primary" : "ring-transparent hover:ring-border",
              )}
            >
              <Image
                src={img.url}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
