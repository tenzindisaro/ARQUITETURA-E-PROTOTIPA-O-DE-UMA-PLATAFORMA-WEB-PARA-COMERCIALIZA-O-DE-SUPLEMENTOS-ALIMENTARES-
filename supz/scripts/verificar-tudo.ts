import { execFileSync } from "node:child_process";

/**
 * Roda todas as suítes de verificação em sequência.
 * Elas usam o banco de desenvolvimento e limpam o que criam — mas contam com
 * os dados do seed, então rode `npm run db:seed` se algo estiver estranho.
 */
const SUITES = [
  ["auth", "Autenticação, cadastro e recuperação de senha"],
  ["catalogo", "Busca, filtros, ordenação e precificação"],
  ["carrinho", "Carrinho de visitante, merge no login e cupons"],
  ["pedidos", "Checkout, estoque, pagamento e cancelamento"],
  ["admin", "Produtos, categorias, marcas, estoque, cupons e usuários"],
  ["sessao", "Validade da sessão contra o banco"],
];

let falhou = false;

for (const [nome, descricao] of SUITES) {
  console.log(`\n${"=".repeat(64)}\n${nome.toUpperCase()} — ${descricao}\n${"=".repeat(64)}`);
  try {
    execFileSync(
      "npx",
      ["tsx", "--conditions=react-server", `scripts/verificar-${nome}.ts`],
      { stdio: "inherit" },
    );
  } catch {
    falhou = true;
  }
}

console.log(`\n${"=".repeat(64)}`);
console.log(falhou ? "ALGUMA SUÍTE FALHOU." : "Todas as suítes passaram.");
process.exit(falhou ? 1 : 0);
