"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { criarMarca, editarMarca, excluirMarca } from "@/app/admin/actions";
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

interface Marca {
  id: string; name: string; slug: string; isActive: boolean;
  _count: { products: number };
}

function Formulario({ marca, onDone }: { marca?: Marca; onDone: () => void }) {
  const router = useRouter();
  const [nome, setNome] = useState(marca?.name ?? "");
  const [slug, setSlug] = useState(marca?.slug ?? "");
  const [ativa, setAtiva] = useState(marca?.isActive ?? true);
  const [pendente, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const dados = { name: nome, slug, isActive: ativa };
          const r = marca ? await editarMarca(marca.id, dados) : await criarMarca(dados);
          if (r.ok) {
            toast.success(marca ? "Marca atualizada" : "Marca criada");
            onDone();
            router.refresh();
          } else {
            toast.error(r.message);
          }
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="marca-nome">Nome</Label>
          <Input
            id="marca-nome" value={nome} required
            placeholder="SUPZ Nutrition"
            onChange={(e) => {
              setNome(e.target.value);
              if (!marca) setSlug(slugify(e.target.value));
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="marca-slug">URL (slug)</Label>
          <Input
            id="marca-slug" value={slug} required className="font-mono"
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={ativa} onCheckedChange={(v) => setAtiva(Boolean(v))} />
        Marca ativa
      </label>

      <div className="flex gap-2">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : marca ? "Salvar" : "Criar marca"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
      </div>
    </form>
  );
}

export function BrandManager({ brands }: { brands: Marca[] }) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      {criando ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Nova marca</CardTitle></CardHeader>
          <CardContent><Formulario onDone={() => setCriando(false)} /></CardContent>
        </Card>
      ) : (
        <Button onClick={() => setCriando(true)}><Plus /> Nova marca</Button>
      )}

      <div className="rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marca</TableHead>
              <TableHead>URL</TableHead>
              <TableHead className="text-right">Produtos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.map((m) =>
              editando === m.id ? (
                <TableRow key={m.id}>
                  <TableCell colSpan={5} className="bg-surface p-5">
                    <Formulario marca={m} onDone={() => setEditando(null)} />
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    /{m.slug}
                  </TableCell>
                  <TableCell className="text-right">
                    {m._count.products > 0 ? (
                      <Link
                        href={`/admin/produtos?q=${encodeURIComponent(m.name)}`}
                        className="hover:text-primary"
                      >
                        {m._count.products}
                      </Link>
                    ) : (
                      m._count.products
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.isActive ? "default" : "secondary"}>
                      {m.isActive ? "ativa" : "inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost" size="icon" aria-label="Editar"
                        onClick={() => setEditando(m.id)}
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
                            <AlertDialogTitle>Excluir “{m.name}”?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Marcas com produtos não podem ser excluídas — nesse
                              caso, desative-a.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                startTransition(async () => {
                                  const r = await excluirMarca(m.id);
                                  if (r.ok) { toast.success("Marca excluída"); router.refresh(); }
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
