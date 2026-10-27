import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Entrar" };

export default async function Page(props: PageProps<"/entrar">) {
  // Quem já tem sessão válida não precisa ver o formulário.
  if (await getCurrentUser()) redirect("/minha-conta");

  const { callbackUrl } = await props.searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-black">Entrar</CardTitle>
        <CardDescription>Acesse sua conta para acompanhar seus pedidos.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <LoginForm callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined} />

        <p className="text-center text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-semibold text-primary hover:underline">
            Criar cadastro
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
