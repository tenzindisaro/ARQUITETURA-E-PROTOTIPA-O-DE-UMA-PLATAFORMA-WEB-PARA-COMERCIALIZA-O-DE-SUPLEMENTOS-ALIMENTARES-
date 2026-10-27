"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { criarCategoria, editarCategoria, excluirCategoria } from "@/app/admin/actions";
import { slugify } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Categoria {
  id: string; name: string; slug: string; description: string | null;
  sortOrder: number; isActive: boolean; _count: { products: number };
}

function Formulario({
  categoria,
  onDone,
}: {
  categoria?: Categoria;
  onDone: () => void;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(categoria?.name ?? "");
  const [slug, setSlug] = useState(categoria?.slug ?? "");
  const [descricao, setDescricao] = useState(categoria?.description ?? "");
  const [ordem, setOrdem] = useState(String(categoria?.sortOrder ?? 0));
  const [ativa, setAtiva] = useState(categoria?.isActive ?? true);
  const [pendente, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const dados = {
            name: nome, slug, description: descricao,
            sortOrder: ordem, isActive: ativa,
          };
          const result = categoria
            ? await editarCategoria(categoria.id, dados)
            : await criarCategoria(dados);

          if (result.ok) {
            toast.success(categoria ? "Categoria atualizada" : "Categoria criada");
            onDone();
            router.refresh();
          } else {
            toast.error(result.message);
          }
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cat-nome">Nome</Label>
          <Input
            id="cat-nome" value={nome} required
            onChange={(e) => {
              setNome(e.target.value);
              if (!categoria) setSlug(slugify(e.target.value));
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cat-slug">URL (slug)</Label>
          <Input
            id="cat-slug" value={slug} required className="font-mono"
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cat-desc">Descrição</Label>
        <Input id="cat-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <div className="w-28 space-y-2">
          <Label htmlFor="cat-ordem">Ordem</Label>
          <Input
            id="cat-ordem" type="number" min="0" value={ordem}
            onChange={(e) => setOrdem(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <Checkbox checked={ativa} onCheckedChange={(v) => setAtiva(Boolean(v))} />
          Categoria ativa
        </label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : categoria ? "Salvar" : "Criar categoria"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
      </div>
    </form>
  );
}

export function CategoryManager({ categories }: { categories: Categoria[] }) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      {criando ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Nova categoria</CardTitle></CardHeader>
          <CardContent><Formulario onDone={() => setCriando(false)} /></CardContent>
        </Card>
      ) : (
        <Button onClick={() => setCriando(true)}><Plus /> Nova categoria</Button>
      )}

      <div className="rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead>URL</TableHead>
              <TableHead className="text-right">Produtos</TableHead>
              <TableHead className="text-right">Ordem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) =>
              editando === c.id ? (
                <TableRow key={c.id}>
                  <TableCell colSpan={6} className="bg-surface p-5">
                    <Formulario categoria={c} onDone={() => setEditando(null)} />
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="font-medium">{c.name}</p>
                    {c.description && (
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {c.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    /{c.slug}
                  </TableCell>
                  <TableCell className="text-right">{c._count.products}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{c.sortOrder}</TableCell>
                  <TableCell>
                    <Badge variant={c.isActive ? "default" : "secondary"}>
                      {c.isActive ? "ativa" : "inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost" size="icon" aria-label="Editar"
                        onClick={() => setEditando(c.id)}
                      >
                        <Pencil />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Excluir" disabled={pendente}>
                            <Trash2 className="text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir “{c.name}”?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Categorias com produtos não podem ser excluídas — nesse
                              caso, desative-a.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                startTransition(async () => {
                                  const r = await excluirCategoria(c.id);
                                  if (r.ok) { toast.success("Categoria excluída"); router.refresh(); }
                                  else toast.error(r.message);
                                })
                              }
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
