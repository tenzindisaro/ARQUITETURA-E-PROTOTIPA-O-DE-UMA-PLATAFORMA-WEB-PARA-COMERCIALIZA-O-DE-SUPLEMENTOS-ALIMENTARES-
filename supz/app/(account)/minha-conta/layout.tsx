import Link from "next/link";
import { requireUser } from "@/lib/session";
import { LogoutButton } from "@/components/layout/logout-button";
import { Toaster } from "@/components/ui/sonner";

// A verificação que vale: o proxy só fez um redirect otimista pelo cookie.
export default async function AccountLayout({ children }: LayoutProps<"/minha-conta">) {
  const user = await requireUser("/minha-conta");

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-black tracking-tight text-primary">
            SUPZ
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {user.name}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <nav className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6">
          {[
            { href: "/minha-conta", label: "Visão geral" },
            { href: "/minha-conta/pedidos", label: "Meus pedidos" },
            { href: "/minha-conta/enderecos", label: "Endereços" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap px-3 py-3 text-sm font-medium text-muted-foreground hover:text-primary"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
      <Toaster position="top-center" richColors />
    </div>
  );
}
