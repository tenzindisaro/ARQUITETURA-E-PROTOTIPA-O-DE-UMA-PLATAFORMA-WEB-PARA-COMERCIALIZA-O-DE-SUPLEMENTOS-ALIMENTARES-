import Link from "next/link";
import { User, Menu } from "lucide-react";
import { getCategories } from "@/lib/services/catalog";
import { getCartItemCount } from "@/lib/services/cart";
import { getSession } from "@/lib/session";
import { SearchInput } from "@/components/shop/search-input";
import { CartBadge } from "@/components/shop/cart-badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export async function SiteHeader() {
  const [categorias, cartCount, session] = await Promise.all([
    getCategories(),
    getCartItemCount(),
    getSession(),
  ]);

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="shrink-0 text-2xl font-black tracking-tight text-primary">
            SUPZ
          </Link>

          <SearchInput className="hidden max-w-sm flex-1 md:block" />

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
              <Link href={session?.user ? "/minha-conta" : "/entrar"}>
                <User />
                <span className="hidden lg:inline">
                  {session?.user ? session.user.name?.split(" ")[0] : "Entrar"}
                </span>
              </Link>
            </Button>

            <CartBadge count={cartCount} />

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="text-primary">SUPZ</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4">
                  <Link href="/produtos" className="rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-secondary">
                    Todos os produtos
                  </Link>
                  {categorias.map((c) => (
                    <Link
                      key={c.id}
                      href={`/categorias/${c.slug}`}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-secondary"
                    >
                      {c.name}
                    </Link>
                  ))}
                  <Link href="/sobre" className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-secondary">
                    Sobre a SUPZ
                  </Link>
                  <Link
                    href={session?.user ? "/minha-conta" : "/entrar"}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-secondary"
                  >
                    {session?.user ? "Minha conta" : "Entrar"}
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="pb-3 md:hidden">
          <SearchInput />
        </div>

        <nav className="hidden items-center gap-1 pb-2 lg:flex">
          {categorias.map((c) => (
            <Link
              key={c.id}
              href={`/categorias/${c.slug}`}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-secondary hover:text-primary"
            >
              {c.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
