import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Recuperar acesso" };

export default function Page() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-black">Recuperar acesso</CardTitle>
        <CardDescription>
          Informe o e-mail da sua conta e geraremos um link para você criar uma
          nova senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
