"use client";

import { useState, useTransition } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import { confirmarPagamento } from "@/app/(shop)/checkout/actions";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PaymentSimulator({ orderId }: { orderId: string }) {
  const [recusado, setRecusado] = useState(false);
  const [pendente, startTransition] = useTransition();

  function decidir(aprovar: boolean) {
    startTransition(async () => {
      const result = await confirmarPagamento(orderId, aprovar);
      // Aprovado redireciona; recusado volta com o resultado.
      if (result && result.ok && !result.data.approved) setRecusado(true);
    });
  }

  return (
    <div className="space-y-4">
      {recusado && (
        <Alert variant="destructive">
          <X />
          <AlertTitle>Pagamento recusado</AlertTitle>
          <AlertDescription>
            O pedido continua aguardando pagamento e o estoque segue reservado
            para você. Tente novamente quando quiser.
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertCircle />
        <AlertTitle>Ambiente de demonstração</AlertTitle>
        <AlertDescription>
          Nenhuma cobrança é feita. Escolha o desfecho da transação para ver
          como o pedido reage em cada caso.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg" className="flex-1 font-bold" disabled={pendente}
          onClick={() => decidir(true)}
        >
          <Check /> {pendente ? "Processando..." : "Simular pagamento aprovado"}
        </Button>
        <Button
          size="lg" variant="outline" className="flex-1" disabled={pendente}
          onClick={() => decidir(false)}
        >
          <X /> Simular recusa
        </Button>
      </div>
    </div>
  );
}
