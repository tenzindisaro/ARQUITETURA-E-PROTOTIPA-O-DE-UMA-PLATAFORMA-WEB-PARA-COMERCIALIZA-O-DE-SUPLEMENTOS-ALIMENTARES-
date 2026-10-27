"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Upload, Star, Trash2, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { enviarImagem, definirImagemPrincipal, excluirImagem } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Imagem {
  id: string; url: string; altText: string | null; isPrimary: boolean;
}

/**
 * As imagens são gravadas em public/uploads/products e o banco guarda apenas o
 * caminho — não há serviço externo neste projeto.
 */
export function ProductImages({
  productId,
  images,
}: {
  productId: string;
  images: Imagem[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [pendente, startTransition] = useTransition();

  async function enviar(file: File) {
    setEnviando(true);
    const formData = new FormData();
    formData.append("file", file);

    const result = await enviarImagem(productId, formData);
    setEnviando(false);

    if (result.ok) {
      toast.success("Imagem enviada");
      router.refresh();
    } else {
      toast.error(result.message);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Imagens</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            JPG, PNG, WebP ou AVIF, até 4 MB. A primeira enviada vira a principal.
          </p>
        </div>
        <Button
          type="button" variant="outline" size="sm"
          disabled={enviando} onClick={() => inputRef.current?.click()}
        >
          <Upload /> {enviando ? "Enviando..." : "Enviar imagem"}
        </Button>
        <input
          ref={inputRef} type="file" className="hidden"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void enviar(file);
          }}
        />
      </CardHeader>

      <CardContent>
        {images.length === 0 ? (
          <div className="rounded-xl border border-dashed py-12 text-center">
            <ImageOff className="mx-auto mb-2 size-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhuma imagem cadastrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.map((img) => (
              <div
                key={img.id}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-xl border-2 bg-surface",
                  img.isPrimary ? "border-primary" : "border-transparent",
                )}
              >
                <Image
                  src={img.url} alt={img.altText ?? ""} fill sizes="200px"
                  className="object-cover"
                />

                {img.isPrimary && (
                  <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                    principal
                  </span>
                )}

                <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  {!img.isPrimary && (
                    <Button
                      type="button" variant="secondary" size="icon" disabled={pendente}
                      aria-label="Definir como principal"
                      onClick={() =>
                        startTransition(async () => {
                          const r = await definirImagemPrincipal(productId, img.id);
                          if (r.ok) { toast.success("Imagem principal atualizada"); router.refresh(); }
                          else toast.error(r.message);
                        })
                      }
                    >
                      <Star />
                    </Button>
                  )}
                  <Button
                    type="button" variant="destructive" size="icon" disabled={pendente}
                    aria-label="Excluir imagem"
                    onClick={() =>
                      startTransition(async () => {
                        const r = await excluirImagem(img.id);
                        if (r.ok) { toast.success("Imagem excluída"); router.refresh(); }
                        else toast.error(r.message);
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
