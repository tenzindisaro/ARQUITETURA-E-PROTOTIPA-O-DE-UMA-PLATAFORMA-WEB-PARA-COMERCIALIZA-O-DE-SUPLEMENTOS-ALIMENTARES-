import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { RegisterForm } from "@/components/auth/register-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Criar cadastro" };

export default async function Page() {
  // Quem já tem sessão válida não precisa ver o formulário.
  if (await getCurrentUser()) redirect("/minha-conta");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-black">Criar cadastro</CardTitle>
        <CardDescription>
          Leva menos de um minuto. Depois é só escolher seus suplementos.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <RegisterForm />

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/entrar" className="font-semibold text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
