import "dotenv/config";
import { db } from "@/lib/db";
import {
  registerCustomer, authenticate, createPasswordResetToken,
  resetPassword, ServiceError,
} from "@/lib/services/auth";
import { registerSchema, isValidCpf } from "@/lib/validations/auth";

let falhas = 0;
function check(nome: string, ok: boolean, extra = "") {
  console.log(`${ok ? "  ok  " : "  FALHA"} ${nome}${extra ? ` — ${extra}` : ""}`);
  if (!ok) falhas++;
}
async function expectError(nome: string, fn: () => Promise<unknown>, campo?: string) {
  try { await fn(); check(nome, false, "não lançou erro"); }
  catch (e) {
    const ok = e instanceof ServiceError && (!campo || e.field === campo);
    check(nome, ok, e instanceof Error ? e.message : String(e));
  }
}

async function main() {
  console.log("\n── Validação de CPF ──");
  check("CPF válido aceito", isValidCpf("529.982.247-25"));
  check("CPF com dígito errado recusado", !isValidCpf("529.982.247-26"));
  check("CPF com dígitos repetidos recusado", !isValidCpf("111.111.111-11"));
  check("CPF curto recusado", !isValidCpf("1234"));

  console.log("\n── Schema de cadastro ──");
  const base = {
    name: "Teste da Silva", email: "TESTE@Email.com ", phone: "(19) 98888-7777",
    cpf: "529.982.247-25", password: "senha123", passwordConfirmation: "senha123",
  };
  const parsed = registerSchema.safeParse(base);
  check("normaliza e-mail para minúsculas", parsed.success && parsed.data.email === "teste@email.com");
  check("remove máscara do CPF", parsed.success && parsed.data.cpf === "52998224725");
  check("remove máscara do telefone", parsed.success && parsed.data.phone === "19988887777");
  check("senhas diferentes recusadas",
    !registerSchema.safeParse({ ...base, passwordConfirmation: "outra123" }).success);
  check("senha sem número recusada",
    !registerSchema.safeParse({ ...base, password: "semnumero", passwordConfirmation: "semnumero" }).success);
  check("senha curta recusada",
    !registerSchema.safeParse({ ...base, password: "abc1", passwordConfirmation: "abc1" }).success);

  console.log("\n── Cadastro ──");
  await db.user.deleteMany({ where: { email: "teste@email.com" } });
  const novo = await registerCustomer(parsed.success ? parsed.data : (() => { throw new Error("parse"); })());
  check("usuário criado com papel CUSTOMER", novo.role === "CUSTOMER");
  const salvo = await db.user.findUnique({ where: { email: "teste@email.com" } });
  check("senha não é gravada em claro", salvo!.passwordHash !== "senha123" && salvo!.passwordHash.startsWith("$2"));
  await expectError("e-mail duplicado recusado", () => registerCustomer(parsed.success ? parsed.data : ({} as never)), "email");
  await expectError("CPF duplicado recusado",
    () => registerCustomer({ ...(parsed.success ? parsed.data : ({} as never)), email: "outro@email.com" }), "cpf");

  console.log("\n── Autenticação ──");
  check("senha correta autentica", (await authenticate("teste@email.com", "senha123")) !== null);
  check("senha errada não autentica", (await authenticate("teste@email.com", "errada")) === null);
  check("e-mail inexistente não autentica", (await authenticate("naoexiste@x.com", "senha123")) === null);
  await db.user.update({ where: { email: "teste@email.com" }, data: { isActive: false } });
  check("usuário desativado não autentica", (await authenticate("teste@email.com", "senha123")) === null);
  await db.user.update({ where: { email: "teste@email.com" }, data: { isActive: true } });

  console.log("\n── Recuperação de senha ──");
  check("e-mail inexistente não gera token", (await createPasswordResetToken("naoexiste@x.com")) === null);
  const t1 = await createPasswordResetToken("teste@email.com");
  check("token gerado para conta existente", typeof t1 === "string" && t1!.length === 64);
  const guardado = await db.passwordResetToken.findFirst({ where: { user: { email: "teste@email.com" }, usedAt: null } });
  check("token não é gravado em claro", guardado!.tokenHash !== t1);

  const t2 = await createPasswordResetToken("teste@email.com");
  const t1Depois = await db.passwordResetToken.findFirst({ where: { tokenHash: { not: guardado!.tokenHash } }, orderBy: { createdAt: "desc" } });
  const t1Invalidado = await db.passwordResetToken.findUnique({ where: { id: guardado!.id } });
  check("novo pedido invalida o anterior", t1Invalidado!.usedAt !== null);
  await expectError("token invalidado é recusado", () => resetPassword(t1!, "novasenha123"), "token");
  await expectError("token inexistente é recusado", () => resetPassword("f".repeat(64), "novasenha123"), "token");

  await resetPassword(t2!, "novasenha123");
  check("senha antiga deixa de valer", (await authenticate("teste@email.com", "senha123")) === null);
  check("senha nova passa a valer", (await authenticate("teste@email.com", "novasenha123")) !== null);
  await expectError("token não pode ser reutilizado", () => resetPassword(t2!, "outrasenha123"), "token");

  const t3 = await createPasswordResetToken("teste@email.com");
  await db.passwordResetToken.updateMany({
    where: { user: { email: "teste@email.com" }, usedAt: null },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  await expectError("token expirado é recusado", () => resetPassword(t3!, "maisuma123"), "token");
  void t1Depois;

  await db.user.deleteMany({ where: { email: "teste@email.com" } });
  console.log(`\n${falhas === 0 ? "Todos os testes passaram." : `${falhas} FALHA(S).`}\n`);
  process.exit(falhas === 0 ? 0 : 1);
}

main().finally(() => db.$disconnect());
