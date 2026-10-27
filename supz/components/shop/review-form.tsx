"use client";

import { useState, useTransition } from "react";
import { Star, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { avaliarProduto } from "@/app/(shop)/produtos/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ReviewForm({
  productId,
  existing,
}: {
  productId: string;
  existing: { rating: number; title: string | null; comment: string } | null;
}) {
  const [nota, setNota] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [titulo, setTitulo] = useState(existing?.title ?? "");
  const [comentario, setComentario] = useState(existing?.comment ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{existing ? "Editar sua avaliação" : "Avaliar este produto"}</CardTitle>
        <CardDescription>
          Você comprou e recebeu este produto, então pode avaliá-lo.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setErro(null);
            startTransition(async () => {
              const result = await avaliarProduto({
                productId,
                rating: nota,
                title: titulo || undefined,
                comment: comentario,
              });
              if (result.ok) {
                toast.success(existing ? "Avaliação atualizada" : "Avaliação publicada");
              } else {
                setErro(result.message);
              }
            });
          }}
        >
          {erro && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Sua nota</Label>
            <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`${i} estrela${i > 1 ? "s" : ""}`}
                  onMouseEnter={() => setHover(i)}
                  onClick={() => setNota(i)}
                >
                  <Star
                    className={cn(
                      "size-7 transition-colors",
                      i <= (hover || nota)
                        ? "fill-accent text-accent"
                        : "fill-muted text-muted-foreground/30",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-title">Título (opcional)</Label>
            <Input
              id="review-title" value={titulo} maxLength={120}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Resuma sua experiência"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-comment">Comentário</Label>
            <Textarea
              id="review-comment" value={comentario} rows={4} maxLength={2000}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Conte como foi sua experiência com o produto"
            />
          </div>

          <Button type="submit" disabled={pendente || nota === 0}>
            {pendente ? "Enviando..." : existing ? "Atualizar avaliação" : "Publicar avaliação"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
