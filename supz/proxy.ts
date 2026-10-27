import { NextResponse, type NextRequest } from "next/server";

// Redirect otimista apenas: verifica a presença do cookie de sessão, sem
// consultar o banco nem decodificar o JWT. A autorização de verdade — inclusive
// o papel do usuário e se a conta ainda existe — acontece em lib/session.ts, no
// layout de cada área e nos services. É a recomendação da documentação do Next:
// nunca confiar somente nesta camada.
//
// Não há o caminho inverso ("já está logado, saia de /entrar") aqui de
// propósito: a presença do cookie não prova que a sessão é válida, e mandar
// /entrar de volta para /minha-conta criaria um laço infinito quando a conta
// tivesse sido apagada ou desativada. Essa decisão fica na própria página, que
// enxerga a sessão de verdade.
//
// Em Next 16 este arquivo se chama `proxy.ts` (antigo `middleware.ts`).

const PROTECTED = ["/admin", "/minha-conta", "/checkout"];

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));

  if (!hasSession && PROTECTED.some((p) => pathname.startsWith(p))) {
    const url = new URL("/entrar", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Fora dos assets estáticos e da própria rota do Auth.js.
  matcher: ["/((?!api/auth|_next/static|_next/image|seed|uploads|favicon.ico).*)"],
};
