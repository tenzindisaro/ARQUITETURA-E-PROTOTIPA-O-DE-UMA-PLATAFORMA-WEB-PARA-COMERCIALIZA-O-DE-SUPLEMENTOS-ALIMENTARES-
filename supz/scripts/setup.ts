import "dotenv/config";
import { execFileSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/client";

/**
 * Preparo do banco na subida da aplicação.
 *
 * Aplica as migrations e popula os dados de demonstração — mas só na primeira
 * vez. Reiniciar o container não pode apagar o que foi criado durante uma
 * apresentação, então o seed só roda se o banco estiver vazio.
 *
 * Para recomeçar do zero: `docker compose down -v`.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

function run(args: string[]) {
  execFileSync("npx", args, { stdio: "inherit" });
}

async function bancoVazio() {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    return (await db.user.count()) === 0;
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  console.log("→ Aplicando migrations...");
  run(["prisma", "migrate", "deploy"]);

  if (await bancoVazio()) {
    console.log("→ Banco vazio: populando dados de demonstração...");
    run(["prisma", "db", "seed"]);
  } else {
    console.log("→ Banco já populado: seed ignorado.");
  }

  console.log("→ Pronto.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
