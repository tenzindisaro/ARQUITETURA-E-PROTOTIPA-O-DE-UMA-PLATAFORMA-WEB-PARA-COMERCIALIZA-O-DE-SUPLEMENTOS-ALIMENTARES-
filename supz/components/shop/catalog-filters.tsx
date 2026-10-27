"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { SORT_OPTIONS } from "@/lib/catalog-sort";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

interface Option { name: string; slug: string }

/**
 * Todos os filtros vivem na querystring. Assim a página continua sendo um
 * Server Component: nenhum fetch no cliente, e a URL é compartilhável.
 */
export function CatalogFilters({
  categories,
  brands,
  priceRange,
  hideCategory = false,
  variant,
}: {
  categories: Option[];
  brands: Option[];
  priceRange: { min: number; max: number };
  hideCategory?: boolean;
  /** "sidebar" fixa na lateral (desktop); "sheet" abre em gaveta (mobile). */
  variant: "sidebar" | "sheet";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [precoMin, setPrecoMin] = useState(params.get("precoMin") ?? "");
  const [precoMax, setPrecoMax] = useState(params.get("precoMax") ?? "");

  function aplicar(mudancas: Record<string, string | null>) {
    const novo = new URLSearchParams(params.toString());
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor === null || valor === "" || valor === "todos") novo.delete(chave);
      else novo.set(chave, valor);
    }
    novo.delete("pagina"); // qualquer mudança de filtro volta para a página 1
    router.push(`${pathname}?${novo.toString()}`);
  }

  function limpar() {
    setPrecoMin("");
    setPrecoMax("");
    const novo = new URLSearchParams();
    const q = params.get("q");
    if (q) novo.set("q", q);
    router.push(`${pathname}?${novo.toString()}`);
  }

  const ativos = ["categoria", "marca", "precoMin", "precoMax", "nota"].filter((k) =>
    params.get(k),
  ).length;

  const conteudo = (
    <div className="space-y-6">
      {!hideCategory && (
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select
            value={params.get("categoria") ?? "todos"}
            onValueChange={(v) => aplicar({ categoria: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as categorias</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Marca</Label>
        <Select
          value={params.get("marca") ?? "todos"}
          onValueChange={(v) => aplicar({ marca: v })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as marcas</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.slug} value={b.slug}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Faixa de preço</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number" inputMode="numeric" min={0} placeholder={`${priceRange.min}`}
            value={precoMin} onChange={(e) => setPrecoMin(e.target.value)}
            aria-label="Preço mínimo"
          />
          <span className="text-muted-foreground">até</span>
          <Input
            type="number" inputMode="numeric" min={0} placeholder={`${priceRange.max}`}
            value={precoMax} onChange={(e) => setPrecoMax(e.target.value)}
            aria-label="Preço máximo"
          />
        </div>
        <Button
          variant="secondary" size="sm" className="w-full"
          onClick={() => aplicar({ precoMin: precoMin || null, precoMax: precoMax || null })}
        >
          Aplicar preço
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Avaliação mínima</Label>
        <Select
          value={params.get("nota") ?? "todos"}
          onValueChange={(v) => aplicar({ nota: v })}
        >
          <SelectTrigger><SelectValue placeholder="Qualquer nota" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Qualquer nota</SelectItem>
            <SelectItem value="4">4 estrelas ou mais</SelectItem>
            <SelectItem value="4.5">4,5 estrelas ou mais</SelectItem>
            <SelectItem value="5">Somente 5 estrelas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {ativos > 0 && (
        <Button variant="ghost" size="sm" className="w-full" onClick={limpar}>
          <X /> Limpar filtros
        </Button>
      )}
    </div>
  );

  if (variant === "sidebar") {
    return (
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-36 rounded-2xl border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <SlidersHorizontal className="size-4" /> Filtros
          </h2>
          {conteudo}
        </div>
      </aside>
    );
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          <SlidersHorizontal /> Filtros
          {ativos > 0 && <Badge className="ml-1">{ativos}</Badge>}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
        <div className="px-4 pb-8">{conteudo}</div>
      </SheetContent>
    </Sheet>
  );
}

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <Select
      value={params.get("ordem") ?? "relevancia"}
      onValueChange={(v) => {
        const novo = new URLSearchParams(params.toString());
        if (v === "relevancia") novo.delete("ordem");
        else novo.set("ordem", v);
        novo.delete("pagina");
        router.push(`${pathname}?${novo.toString()}`);
      }}
    >
      <SelectTrigger className="w-[190px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(SORT_OPTIONS).map(([key, label]) => (
          <SelectItem key={key} value={key}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
