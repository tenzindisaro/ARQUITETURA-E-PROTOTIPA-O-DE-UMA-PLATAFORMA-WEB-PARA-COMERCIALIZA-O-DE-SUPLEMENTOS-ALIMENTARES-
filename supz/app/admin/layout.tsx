import Link from "next/link";
import {
  LayoutDashboard, Package, FolderTree, Tags, ShoppingBag, Boxes,
  Users, Ticket, BarChart3, Store,
} from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { LogoutButton } from "@/components/layout/logout-button";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/categorias", label: "Categorias", icon: FolderTree },
  { href: "/admin/marcas", label: "Marcas", icon: Tags },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/admin/estoque", label: "Estoque", icon: Boxes },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/cupons", label: "Cupons", icon: Ticket },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
];

/**
 * Barreira de autorização da área administrativa. O `proxy.ts` apenas
 * redireciona quem não tem cookie de sessão; é aqui que o papel ADMIN é
 * conferido — e cada Server Action confere de novo por conta própria.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="sticky top-0 z-40 bg-ink text-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-3">
          <Link href="/admin" className="shrink-0 text-xl font-black tracking-tight">
            SUPZ <span className="text-accent">admin</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
              <Link href="/"><Store /> <span className="hidden sm:inline">Ver loja</span></Link>
            </Button>
            <span className="hidden text-sm text-white/60 lg:block">{admin.email}</span>
            <LogoutButton className="text-white hover:bg-white/10 hover:text-white" />
          </div>
        </div>

        <nav className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-6">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 whitespace-nowrap px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:text-white"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-8">{children}</main>
      <Toaster position="top-center" richColors />
    </div>
  );
}
