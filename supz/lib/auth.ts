import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
// Importado só para viabilizar a augmentation do módulo abaixo.
import type {} from "next-auth/jwt";
import { loginSchema } from "@/lib/validations/auth";
import { authenticate } from "@/lib/services/auth";
import { readCartToken, clearCartToken } from "@/lib/cart-session";
import type { Role } from "@/prisma/generated/enums";

// Sessão em JWT: não usamos o adapter do Prisma porque só há login por
// credenciais. Se um dia entrar login social, aí sim entram as tabelas
// Account/Session do adapter.

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }
  interface User {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/entrar",
    error: "/entrar",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        return authenticate(parsed.data.email, parsed.data.password);
      },
    }),
  ],
  events: {
    // O login acontece dentro do Route Handler do Auth.js, onde os cookies
    // ainda podem ser alterados — é o único ponto em que dá para mesclar o
    // carrinho do visitante e apagar o cookie dele.
    async signIn({ user }) {
      const guestToken = await readCartToken();
      if (!guestToken || !user.id) return;

      // Importado aqui dentro para não puxar o serviço de carrinho (e o
      // Prisma) para dentro do bundle de autenticação em toda requisição.
      const { mergeGuestCart } = await import("@/lib/services/cart");
      await mergeGuestCart(user.id, guestToken);
      await clearCartToken();
    },
  },
  callbacks: {
    jwt({ token, user }) {
      // `user` só vem na primeira chamada, logo após o login.
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
});
