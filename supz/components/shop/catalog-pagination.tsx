import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function CatalogPagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  // Janela curta de páginas ao redor da atual.
  const paginas = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  return (
    <nav className="mt-10 flex items-center justify-center gap-1" aria-label="Paginação">
      {page > 1 && (
        <Link
          href={buildHref(page - 1)}
          className="flex size-9 items-center justify-center rounded-lg border hover:bg-secondary"
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" />
        </Link>
      )}

      {paginas.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && paginas[i - 1] !== p - 1 && (
            <span className="px-1 text-muted-foreground">…</span>
          )}
          <Link
            href={buildHref(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg border text-sm font-medium",
              p === page
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-secondary",
            )}
          >
            {p}
          </Link>
        </span>
      ))}

      {page < totalPages && (
        <Link
          href={buildHref(page + 1)}
          className="flex size-9 items-center justify-center rounded-lg border hover:bg-secondary"
          aria-label="Próxima página"
        >
          <ChevronRight className="size-4" />
        </Link>
      )}
    </nav>
  );
}
