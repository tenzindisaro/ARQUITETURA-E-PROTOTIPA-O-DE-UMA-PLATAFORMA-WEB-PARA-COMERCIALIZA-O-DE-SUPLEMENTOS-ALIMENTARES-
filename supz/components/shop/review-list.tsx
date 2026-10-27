import { plural } from "@/lib/format";
import { StarRating } from "@/components/shop/star-rating";
import { Progress } from "@/components/ui/progress";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  createdAt: Date;
  user: { name: string };
}

/** Só a inicial do sobrenome aparece, para não expor o nome completo. */
function abreviarNome(nome: string) {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1][0]}.`;
}

export function ReviewList({
  reviews,
  average,
  count,
  breakdown,
}: {
  reviews: Review[];
  average: number;
  count: number;
  breakdown: Array<{ rating: number; count: number }>;
}) {
  if (count === 0) {
    return (
      <div className="rounded-2xl border border-dashed py-12 text-center">
        <p className="font-semibold">Este produto ainda não tem avaliações</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Somente quem comprou e recebeu o produto pode avaliá-lo.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <div className="space-y-4">
        <div className="rounded-2xl border bg-card p-6 text-center">
          <p className="text-5xl font-black text-primary">
            {average.toFixed(1).replace(".", ",")}
          </p>
          <StarRating rating={average} size="md" className="mt-2 justify-center" />
          <p className="mt-2 text-sm text-muted-foreground">
            {plural(count, "avaliação", "avaliações")}
          </p>
        </div>

        <div className="space-y-2">
          {breakdown.map((b) => (
            <div key={b.rating} className="flex items-center gap-2 text-sm">
              <span className="w-8 shrink-0 text-muted-foreground">{b.rating}★</span>
              <Progress value={count ? (b.count / count) * 100 : 0} className="h-2" />
              <span className="w-6 shrink-0 text-right text-xs text-muted-foreground">
                {b.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ul className="divide-y">
        {reviews.map((r) => (
          <li key={r.id} className="py-5 first:pt-0">
            <div className="flex flex-wrap items-center gap-3">
              <StarRating rating={r.rating} />
              <span className="text-sm font-semibold">{abreviarNome(r.user.name)}</span>
              <span className="text-xs text-muted-foreground">
                {r.createdAt.toLocaleDateString("pt-BR")}
              </span>
              <span className="rounded-md bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                Compra verificada
              </span>
            </div>
            {r.title && <p className="mt-2 font-bold">{r.title}</p>}
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.comment}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
