"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TriangleAlert, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { ajustarEstoque } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Item {
  id: string; name: string; sku: string; stock: number; lowStockThreshold: number;
  isActive: boolean; product: { id: string; name: string; slug: string; isActive: boolean };
}

function AjusteDialog({ item }: { item: Item }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [quantidade, setQuantidade] = useState("1");
  const [sinal, setSinal] = useState<1 | -1>(1);
  const [motivo, setMotivo] = useState("");
  const [pendente, startTransition] = useTransition();

  const delta = sinal * (Number(quantidade) || 0);
  const resultado = item.stock + delta;

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Ajustar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar estoque</DialogTitle>
          <DialogDescription>
            {item.product.name} — {item.name} (SKU {item.sku})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex rounded-xl border">
              <Button
                type="button" variant={sinal === 1 ? "default" : "ghost"} size="icon"
                aria-label="Entrada" onClick={() => setSinal(1)}
              >
                <Plus />
              </Button>
              <Button
                type="button" variant={sinal === -1 ? "default" : "ghost"} size="icon"
                aria-label="Saída" onClick={() => setSinal(-1)}
              >
                <Minus />
              </Button>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="qtd">Quantidade</Label>
              <Input
                id="qtd" type="number" min="1" value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Input
              id="motivo" value={motivo} maxLength={160}
              placeholder="Reposição do fornecedor, perda, inventário..."
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>

          <p className="rounded-xl bg-secondary p-3 text-sm">
            Saldo atual <strong>{item.stock}</strong> → novo saldo{" "}
            <strong className={resultado < 0 ? "text-destructive" : "text-primary"}>
              {resultado}
            </strong>
          </p>
        </div>

        <DialogFooter>
          <Button
            disabled={pendente || resultado < 0 || motivo.trim().length < 3 || delta === 0}
            onClick={() =>
              startTransition(async () => {
                const r = await ajustarEstoque({
                  variantId: item.id, delta, reason: motivo,
                });
                if (r.ok) {
                  toast.success("Estoque ajustado");
                  setAberto(false);
                  setMotivo("");
                  router.refresh();
                } else {
                  toast.error(r.message);
                }
              })
            }
          >
            {pendente ? "Salvando..." : "Confirmar ajuste"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StockManager({ items }: { items: Item[] }) {
  const [somenteBaixo, setSomenteBaixo] = useState(false);

  const visiveis = somenteBaixo
    ? items.filter((i) => i.stock <= i.lowStockThreshold)
    : items;

  const baixos = items.filter((i) => i.stock <= i.lowStockThreshold).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm" variant={somenteBaixo ? "outline" : "default"}
          onClick={() => setSomenteBaixo(false)}
        >
          Todos <span className="ml-1 opacity-60">{items.length}</span>
        </Button>
        <Button
          size="sm" variant={somenteBaixo ? "default" : "outline"}
          onClick={() => setSomenteBaixo(true)}
        >
          <TriangleAlert /> Estoque baixo <span className="ml-1 opacity-60">{baixos}</span>
        </Button>
      </div>

      <div className="rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Variante</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.map((item) => {
              const esgotado = item.stock === 0;
              const baixo = item.stock <= item.lowStockThreshold;

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      href={`/admin/produtos/${item.product.id}`}
                      className="text-sm font-medium hover:text-primary"
                    >
                      {item.product.name}
                    </Link>
                    {!item.product.isActive && (
                      <Badge variant="secondary" className="ml-2">produto inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                  <TableCell className={cn("text-right font-bold", esgotado && "text-destructive")}>
                    {item.stock}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {item.lowStockThreshold}
                  </TableCell>
                  <TableCell>
                    {esgotado ? (
                      <Badge variant="destructive">esgotado</Badge>
                    ) : baixo ? (
                      <Badge className="bg-accent text-accent-foreground">baixo</Badge>
                    ) : (
                      <Badge variant="secondary">ok</Badge>
                    )}
                  </TableCell>
                  <TableCell><AjusteDialog item={item} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
