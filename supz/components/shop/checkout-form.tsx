"use client";

import { useState, useTransition } from "react";
import { MapPin, Plus, Truck, CreditCard, QrCode, Barcode, AlertCircle } from "lucide-react";
import { finalizarPedido } from "@/app/(shop)/checkout/actions";
import { AddressForm } from "@/components/shop/address-form";
import { SHIPPING_METHODS, type ShippingMethodId } from "@/lib/shipping";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Endereco {
  id: string; label: string; recipient: string; zipCode: string; street: string;
  number: string; complement: string | null; district: string; city: string;
  state: string; isDefault: boolean;
}

const PAGAMENTOS = [
  { id: "PIX", label: "Pix", desc: "Aprovação imediata", icon: QrCode },
  { id: "CREDIT_CARD", label: "Cartão de crédito", desc: "Em até 12x sem juros", icon: CreditCard },
  { id: "BOLETO", label: "Boleto bancário", desc: "Compensa em até 3 dias úteis", icon: Barcode },
] as const;

export function CheckoutForm({
  addresses,
  subtotal,
  onShippingChange,
}: {
  addresses: Endereco[];
  subtotal: number;
  onShippingChange?: (m: ShippingMethodId) => void;
}) {
  const [addressId, setAddressId] = useState(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "",
  );
  const [novoEndereco, setNovoEndereco] = useState(addresses.length === 0);
  const [entrega, setEntrega] = useState<ShippingMethodId>("standard");
  const [pagamento, setPagamento] = useState<string>("PIX");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  const freteGratis = subtotal >= 299;

  function enviar() {
    setErro(null);
    startTransition(async () => {
      const result = await finalizarPedido({
        addressId,
        shippingMethod: entrega,
        paymentMethod: pagamento,
      });
      // Em caso de sucesso a ação redireciona e nada retorna.
      if (result && !result.ok) setErro(result.message);
    });
  }

  return (
    <div className="space-y-6">
      {erro && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      {/* Endereço */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="size-4 text-primary" /> Endereço de entrega
          </CardTitle>
          {addresses.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setNovoEndereco((v) => !v)}>
              <Plus /> {novoEndereco ? "Cancelar" : "Novo endereço"}
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {addresses.length > 0 && !novoEndereco && (
            <RadioGroup value={addressId} onValueChange={setAddressId} className="space-y-2">
              {addresses.map((a) => (
                <Label
                  key={a.id}
                  htmlFor={`end-${a.id}`}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                    addressId === a.id ? "border-primary bg-primary/5" : "hover:border-primary/40",
                  )}
                >
                  <RadioGroupItem value={a.id} id={`end-${a.id}`} className="mt-1" />
                  <div className="text-sm font-normal">
                    <p className="font-bold">
                      {a.label}
                      {a.isDefault && (
                        <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-xs font-medium">
                          padrão
                        </span>
                      )}
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
                </Label>
              ))}
            </RadioGroup>
          )}

          {novoEndereco && (
            <AddressForm
              onSaved={(id) => {
                if (id) setAddressId(id);
                setNovoEndereco(false);
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Entrega */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="size-4 text-primary" /> Forma de entrega
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={entrega}
            onValueChange={(v) => {
              setEntrega(v as ShippingMethodId);
              onShippingChange?.(v as ShippingMethodId);
            }}
            className="space-y-2"
          >
            {SHIPPING_METHODS.map((m) => (
              <Label
                key={m.id}
                htmlFor={`frete-${m.id}`}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors",
                  entrega === m.id ? "border-primary bg-primary/5" : "hover:border-primary/40",
                )}
              >
                <RadioGroupItem value={m.id} id={`frete-${m.id}`} />
                <div className="flex-1 text-sm font-normal">
                  <p className="font-bold">{m.label}</p>
                  <p className="text-muted-foreground">{m.etaDays}</p>
                </div>
                <span className="font-bold">
                  {freteGratis ? (
                    <span className="text-success">Grátis</span>
                  ) : (
                    formatPrice(m.price)
                  )}
                </span>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4 text-primary" /> Forma de pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <RadioGroup value={pagamento} onValueChange={setPagamento} className="space-y-2">
            {PAGAMENTOS.map((p) => (
              <Label
                key={p.id}
                htmlFor={`pag-${p.id}`}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors",
                  pagamento === p.id ? "border-primary bg-primary/5" : "hover:border-primary/40",
                )}
              >
                <RadioGroupItem value={p.id} id={`pag-${p.id}`} />
                <p.icon className="size-5 text-muted-foreground" />
                <div className="text-sm font-normal">
                  <p className="font-bold">{p.label}</p>
                  <p className="text-muted-foreground">{p.desc}</p>
                </div>
              </Label>
            ))}
          </RadioGroup>

          <Alert>
            <AlertCircle />
            <AlertDescription>
              Pagamento simulado: nenhuma cobrança é feita e nenhum dado de
              cartão é solicitado. Na tela seguinte você escolhe se a transação
              é aprovada ou recusada, para demonstrar os dois caminhos.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Button
        size="lg"
        className="w-full font-bold"
        disabled={pendente || !addressId || novoEndereco}
        onClick={enviar}
      >
        {pendente ? "Finalizando..." : "Finalizar pedido"}
      </Button>
    </div>
  );
}
