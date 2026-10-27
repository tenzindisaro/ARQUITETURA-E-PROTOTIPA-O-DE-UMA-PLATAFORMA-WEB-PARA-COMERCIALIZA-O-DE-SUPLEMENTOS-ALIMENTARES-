"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck, TriangleAlert } from "lucide-react";
import { solicitarRecuperacao } from "@/app/(auth)/actions";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function ForgotPasswordForm() {
  const [enviado, setEnviado] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: ForgotPasswordInput) {
    startTransition(async () => {
      const result = await solicitarRecuperacao(values);
      if (result.ok) {
        setLink(result.data.link);
        setEnviado(true);
      }
    });
  }

  if (enviado) {
    return (
      <div className="space-y-4">
        <Alert>
          <MailCheck />
          <AlertTitle>Solicitação registrada</AlertTitle>
          <AlertDescription>
            Se houver uma conta com esse e-mail, o link de redefinição foi gerado.
            Ele vale por 30 minutos.
          </AlertDescription>
        </Alert>

        {link && (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>Modo demonstração</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                Este projeto não integra serviço de e-mail, então o link aparece
                aqui na tela. Numa aplicação real ele seria enviado por e-mail e
                nunca chegaria ao navegador.
              </p>
              <Link
                href={link}
                className="break-all font-semibold underline underline-offset-2"
              >
                {link}
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <Button asChild variant="outline" className="w-full">
          <Link href="/entrar">Voltar para o login</Link>
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail cadastrado</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="voce@email.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={pendente}>
          {pendente ? "Gerando link..." : "Recuperar acesso"}
        </Button>

        <Button asChild variant="ghost" className="w-full">
          <Link href="/entrar">Voltar</Link>
        </Button>
      </form>
    </Form>
  );
}
