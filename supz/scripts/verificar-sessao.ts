import "dotenv/config";
import { db } from "@/lib/db";

/**
 * Reproduz a situação em que o token continua válido mas a conta por trás dele
 * não serve mais: apagada, desativada ou com o papel rebaixado.
 *
 * Não dá para chamar `getCurrentUser()` daqui (depende do contexto de
 * requisição do Next), então o teste exercita a consulta que ela faz — que é
 * exatamente o que separa uma sessão boa de uma sessão obsoleta.
 */
async function usuarioDaSessao(idNoToken: string) {
  const user = await db.user.findUnique({
    where: { id: idNoToken },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return user;
}

let falhas = 0;
function check(nome: string, ok: boolean, extra = "") {
  console.log(`${ok ? "  ok  " : "  FALHA"} ${nome}${extra ? ` — ${extra}` : ""}`);
  if (!ok) falhas++;
}

async function main() {
  console.log("\n── Sessão conferida contra o banco ──");

  const admin = await db.user.findUniqueOrThrow({ where: { email: "admin@supz.com.br" } });
  check("sessão de conta válida é aceita", (await usuarioDaSessao(admin.id)) !== null);

  // Foi exatamente este o caso do erro de chave estrangeira: o seed recriou os
  // usuários com novos ids e o token continuou apontando para o id antigo.
  check("token apontando para conta inexistente é recusado",
    (await usuarioDaSessao("cmt00000000000000000000000")) === null);

  await db.user.update({ where: { id: admin.id }, data: { isActive: false } });
  check("conta desativada invalida a sessão na hora",
    (await usuarioDaSessao(admin.id)) === null);
  await db.user.update({ where: { id: admin.id }, data: { isActive: true } });

  // O papel também vem do banco, não do token: rebaixar tem efeito imediato.
  await db.user.update({ where: { id: admin.id }, data: { role: "CUSTOMER" } });
  check("papel rebaixado vale imediatamente",
    (await usuarioDaSessao(admin.id))?.role === "CUSTOMER");
  await db.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
  check("papel restaurado", (await usuarioDaSessao(admin.id))?.role === "ADMIN");

  console.log(`\n${falhas === 0 ? "Todos os testes passaram." : `${falhas} FALHA(S).`}\n`);
  process.exit(falhas === 0 ? 0 : 1);
}

main().finally(() => db.$disconnect());
