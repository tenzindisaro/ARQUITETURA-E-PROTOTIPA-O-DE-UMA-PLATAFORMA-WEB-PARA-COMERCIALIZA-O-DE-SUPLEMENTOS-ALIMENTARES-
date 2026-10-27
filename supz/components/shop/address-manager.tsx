"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { excluirEndereco } from "@/app/(shop)/checkout/actions";
import { AddressForm } from "@/components/shop/address-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Endereco {
  id: string; label: string; recipient: string; zipCode: string; street: string;
  number: string; complement: string | null; district: string; city: string;
  state: string; isDefault: boolean;
}

export function AddressManager({ addresses }: { addresses: Endereco[] }) {
  const [criando, setCriando] = useState(addresses.length === 0);
  const [editando, setEditando] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-4">
      {addresses.map((a) =>
        editando === a.id ? (
          <Card key={a.id}>
            <CardHeader>
              <CardTitle className="text-base">Editar endereço</CardTitle>
            </CardHeader>
            <CardContent>
              <AddressForm
                addressId={a.id}
                defaultValues={{ ...a, complement: a.complement ?? "" }}
                onSaved={() => {
                  setEditando(null);
                  router.refresh();
                }}
              />
              <Button variant="ghost" className="mt-3" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div key={a.id} className="flex items-start gap-4 rounded-2xl border bg-card p-5">
            <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-bold">
                {a.label}
                {a.isDefault && <Badge variant="secondary" className="ml-2">padrão</Badge>}
              </p>
              <p className="text-muted-foreground">
                {a.recipient} · {a.street}, {a.number}
                {a.complement ? ` — ${a.complement}` : ""}
              </p>
              <p className="text-muted-foreground">
                {a.district}, {a.city}/{a.state} — CEP{" "}
                {a.zipCode.replace(/(\d{5})(\d{3})/, "$1-$2")}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost" size="icon" aria-label="Editar endereço"
                onClick={() => setEditando(a.id)}
              >
                <Pencil />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Excluir endereço" disabled={pendente}>
                    <Trash2 className="text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir “{a.label}”?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Pedidos já feitos guardam uma cópia do endereço, então o
                      histórico não é afetado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        startTransition(async () => {
                          const result = await excluirEndereco(a.id);
                          if (result.ok) {
                            toast.success("Endereço excluído");
                            router.refresh();
                          } else {
                            toast.error(result.message);
                          }
                        })
                      }
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ),
      )}

      {criando ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Novo endereço</CardTitle></CardHeader>
          <CardContent>
            <AddressForm
              onSaved={() => {
                setCriando(false);
                router.refresh();
              }}
            />
            {addresses.length > 0 && (
              <Button variant="ghost" className="mt-3" onClick={() => setCriando(false)}>
                Cancelar
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setCriando(true)}>
          <Plus /> Adicionar endereço
        </Button>
      )}
    </div>
  );
}
