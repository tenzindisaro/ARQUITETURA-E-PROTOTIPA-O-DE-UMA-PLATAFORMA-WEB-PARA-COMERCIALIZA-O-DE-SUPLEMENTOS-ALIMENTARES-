import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Plus, Package, TriangleAlert } from "lucide-react";
import { listAdminProducts } from "@/lib/services/products-admin";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Produtos" };

export default async function Page(props: PageProps<"/admin/produtos">) {
  const raw = await props.searchParams;
  const q = typeof raw.q === "string" ? raw.q : undefined;
  const page = Number(raw.pagina ?? 1) || 1;

  const { produtos, total, totalPages } = await listAdminProducts({ q, page });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Produtos</h1>
          <p className="text-muted-foreground">{total} produtos cadastrados</p>
        </div>
        <Button asChild>
          <Link href="/admin/produtos/novo"><Plus /> Novo produto</Link>
        </Button>
      </div>

      <form className="max-w-sm">
        <Input name="q" defaultValue={q} placeholder="Buscar por nome ou SKU..." />
      </form>

      <div className="rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16"></TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtos.map((p) => {
              const estoque = p.variants.reduce((s, v) => s + v.stock, 0);
              const baixo = p.variants.some((v) => v.stock <= v.lowStockThreshold);

              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="relative size-11 overflow-hidden rounded-lg bg-surface">
                      {p.images[0] ? (
                        <Image src={p.images[0].url} alt="" fill sizes="44px" className="object-cover" />
                      ) : (
                        <Package className="m-auto size-4 text-muted-foreground/30" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.brand.name} · {p.variants.length} variante{p.variants.length === 1 ? "" : "s"}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.category.name}</TableCell>
                  <TableCell className="text-right">
                    {p.salePrice ? (
                      <>
                        <span className="text-xs text-muted-foreground line-through">
                          {formatPrice(Number(p.price))}
                        </span>
                        <p className="font-bold text-primary">{formatPrice(Number(p.salePrice))}</p>
                      </>
                    ) : (
                      <span className="font-medium">{formatPrice(Number(p.price))}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={baixo ? "font-bold text-destructive" : ""}>
                      {estoque}
                    </span>
                    {baixo && <TriangleAlert className="ml-1 inline size-3.5 text-destructive" />}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={p.isActive ? "default" : "secondary"}>
                        {p.isActive ? "ativo" : "inativo"}
                      </Badge>
                      {p.isFeatured && <Badge variant="outline">destaque</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/produtos/${p.id}`}>Editar</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p} asChild size="sm"
              variant={p === page ? "default" : "outline"}
            >
              <Link href={`/admin/produtos?pagina=${p}${q ? `&q=${q}` : ""}`}>{p}</Link>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
