"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { criarCupom, editarCupom, alternarCupom, excluirCupom } from "@/app/admin/actions";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Cupom {
  id: string; code: string; description: string | null;
  discountType: "PERCENTAGE" | "FIXED"; discountValue: number;
  minOrderTotal: number | null; maxDiscount: number | null;
  expiresAt: string | null; usageLimit: number | null;
  usageLimitPerUser: number | null; usedCount: number; isActive: boolean;
  totalDescontado: number;
}

function Formulario({ cupom, onDone }: { cupom?: Cupom; onDone: () => void }) {
  const router = useRouter();
  const [v, setV] = useState({
    code: cupom?.code ?? "",
    description: cupom?.description ?? "",
    discountType: cupom?.discountType ?? "PERCENTAGE",
    discountValue: String(cupom?.discountValue ?? ""),
    minOrderTotal: cupom?.minOrderTotal != null ? String(cupom.minOrderTotal) : "",
    maxDiscount: cupom?.maxDiscount != null ? String(cupom.maxDiscount) : "",
    expiresAt: cupom?.expiresAt ? cupom.expiresAt.slice(0, 10) : "",
    usageLimit: cupom?.usageLimit != null ? String(cupom.usageLimit) : "",
    usageLimitPerUser: cupom?.usageLimitPerUser != null ? String(cupom.usageLimitPerUser) : "1",
    isActive: cupom?.isActive ?? true,
  });
  const [pendente, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const dados = {
            code: v.code,
            description: v.description,
            discountType: v.discountType,
            discountValue: v.discountValue,
            minOrderTotal: v.minOrderTotal === "" ? null : v.minOrderTotal,
            maxDiscount: v.maxDiscount === "" ? null : v.maxDiscount,
            expiresAt: v.expiresAt,
            usageLimit: v.usageLimit === "" ? null : v.usageLimit,
            usageLimitPerUser: v.usageLimitPerUser === "" ? null : v.usageLimitPerUser,
            isActive: v.isActive,
          };
          const r = cupom ? await editarCupom(cupom.id, dados) : await criarCupom(dados);
          if (r.ok) {
            toast.success(cupom ? "Cupom atualizado" : "Cupom criado");
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
          <Label htmlFor="cod">Código</Label>
          <Input
            id="cod" required className="font-mono uppercase" value={v.code}
            onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">Descrição</Label>
          <Input
            id="desc" value={v.description}
            onChange={(e) => setV({ ...v, description: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Tipo de desconto</Label>
          <Select
            value={v.discountType}
            onValueChange={(x) => setV({ ...v, discountType: x as "PERCENTAGE" | "FIXED" })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENTAGE">Percentual (%)</SelectItem>
              <SelectItem value="FIXED">Valor fixo (R$)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="val">
            {v.discountType === "PERCENTAGE" ? "Percentual" : "Valor (R$)"}
          </Label>
          <Input
            id="val" type="number" step="0.01" min="0" required value={v.discountValue}
            onChange={(e) => setV({ ...v, discountValue: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teto">Teto do desconto (R$)</Label>
          <Input
            id="teto" type="number" step="0.01" min="0" value={v.maxDiscount}
            placeholder="sem teto"
            onChange={(e) => setV({ ...v, maxDiscount: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="min">Pedido mínimo (R$)</Label>
          <Input
            id="min" type="number" step="0.01" min="0" value={v.minOrderTotal}
            placeholder="sem mínimo"
            onChange={(e) => setV({ ...v, minOrderTotal: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exp">Validade</Label>
          <Input
            id="exp" type="date" value={v.expiresAt}
            onChange={(e) => setV({ ...v, expiresAt: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lim">Limite total</Label>
          <Input
            id="lim" type="number" min="1" value={v.usageLimit} placeholder="ilimitado"
            onChange={(e) => setV({ ...v, usageLimit: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="limu">Limite por cliente</Label>
          <Input
            id="limu" type="number" min="1" value={v.usageLimitPerUser} placeholder="ilimitado"
            onChange={(e) => setV({ ...v, usageLimitPerUser: e.target.value })}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={v.isActive}
          onCheckedChange={(x) => setV({ ...v, isActive: Boolean(x) })}
        />
        Cupom ativo
      </label>

      <div className="flex gap-2">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : cupom ? "Salvar" : "Criar cupom"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
      </div>
    </form>
  );
}

export function CouponManager({ coupons }: { coupons: Cupom[] }) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  function situacao(c: Cupom) {
    if (!c.isActive) return <Badge variant="secondary">desativado</Badge>;
    if (c.expiresAt && new Date(c.expiresAt) < new Date())
      return <Badge variant="destructive">expirado</Badge>;
    if (c.usageLimit !== null && c.usedCount >= c.usageLimit)
      return <Badge variant="destructive">esgotado</Badge>;
    return <Badge>ativo</Badge>;
  }

  return (
    <div className="space-y-6">
      {criando ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Novo cupom</CardTitle></CardHeader>
          <CardContent><Formulario onDone={() => setCriando(false)} /></CardContent>
        </Card>
      ) : (
        <Button onClick={() => setCriando(true)}><Plus /> Novo cupom</Button>
      )}

      <div className="rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Regras</TableHead>
              <TableHead className="text-right">Usos</TableHead>
              <TableHead className="text-right">Descontado</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((c) =>
              editando === c.id ? (
                <TableRow key={c.id}>
                  <TableCell colSpan={7} className="bg-surface p-5">
                    <Formulario cupom={c} onDone={() => setEditando(null)} />
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="font-mono font-bold">{c.code}</p>
                    {c.description && (
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {c.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {c.discountType === "PERCENTAGE"
                      ? `${c.discountValue}%`
                      : formatPrice(c.discountValue)}
                    {c.maxDiscount != null && (
                      <span className="block text-xs text-muted-foreground">
                        até {formatPrice(c.maxDiscount)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.minOrderTotal != null && <p>mín. {formatPrice(c.minOrderTotal)}</p>}
                    {c.expiresAt && (
                      <p>até {new Date(c.expiresAt).toLocaleDateString("pt-BR")}</p>
                    )}
                    {c.usageLimitPerUser != null && <p>{c.usageLimitPerUser}× por cliente</p>}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.usedCount}
                    {c.usageLimit != null && (
                      <span className="text-muted-foreground">/{c.usageLimit}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatPrice(c.totalDescontado)}
                  </TableCell>
                  <TableCell>{situacao(c)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost" size="sm" disabled={pendente}
                        onClick={() =>
                          startTransition(async () => {
                            const r = await alternarCupom(c.id, !c.isActive);
                            if (r.ok) { toast.success("Cupom atualizado"); router.refresh(); }
                            else toast.error(r.message);
                          })
                        }
                      >
                        {c.isActive ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        variant="ghost" size="icon" aria-label="Editar"
                        onClick={() => setEditando(c.id)}
                      >
                        <Pencil />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Excluir">
                            <Trash2 className="text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir “{c.code}”?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cupons já utilizados em pedidos não podem ser excluídos —
                              nesse caso, desative-o.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                startTransition(async () => {
                                  const r = await excluirCupom(c.id);
                                  if (r.ok) { toast.success("Cupom excluído"); router.refresh(); }
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
