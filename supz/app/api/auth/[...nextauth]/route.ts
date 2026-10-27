// Único Route Handler da aplicação: exigência do Auth.js (callbacks, CSRF,
// endpoint de sessão). Todo o resto usa Server Components e Server Actions.
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
