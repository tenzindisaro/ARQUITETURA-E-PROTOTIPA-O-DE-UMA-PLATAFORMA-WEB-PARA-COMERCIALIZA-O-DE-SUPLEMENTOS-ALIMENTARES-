import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Redefinir senha" };

export default async function Page(props: PageProps<"/redefinir-senha">) {
  const { token } = await props.searchParams;

  if (typeof token !== "string" || !token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-black">Link inválido</CardTitle>
          <CardDescription>
            Este endereço não contém um token de redefinição válido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/recuperar-senha">Solicitar novo link</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-black">Nova senha</CardTitle>
        <CardDescription>Escolha uma senha para acessar sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm token={token} />
      </CardContent>
    </Card>
  );
}
