import "server-only";
import { randomBytes } from "node:crypto";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import path from "node:path";
import { ServiceError } from "@/lib/services/auth";

/**
 * Armazenamento local de imagens. Não há serviço externo neste projeto: o
 * arquivo vai para `public/uploads/products/` e no PostgreSQL fica apenas o
 * caminho — nunca o binário.
 *
 * Isso funciona em `next dev` e `next start` locais. Num deploy serverless os
 * arquivos não sobreviveriam entre requisições; é uma limitação aceita, já que
 * o projeto roda na máquina.
 */
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");
const PUBLIC_PREFIX = "/uploads/products";

const MAX_BYTES = 4 * 1024 * 1024;
const TIPOS_ACEITOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function saveProductImage(file: File): Promise<string> {
  if (!file || file.size === 0) throw new ServiceError("Nenhum arquivo enviado.");

  if (file.size > MAX_BYTES) {
    throw new ServiceError("A imagem deve ter no máximo 4 MB.");
  }

  const extensao = TIPOS_ACEITOS[file.type];
  if (!extensao) {
    throw new ServiceError("Formato não aceito. Envie JPG, PNG, WebP ou AVIF.");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  // Nome aleatório: o nome original do arquivo nunca chega ao disco, o que
  // elimina qualquer risco de path traversal.
  const nome = `${Date.now()}-${randomBytes(6).toString("hex")}.${extensao}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(path.join(UPLOAD_DIR, nome), buffer);

  return `${PUBLIC_PREFIX}/${nome}`;
}

/** Remove o arquivo do disco. Imagens do seed nunca são apagadas. */
export async function deleteProductImageFile(url: string) {
  if (!url.startsWith(`${PUBLIC_PREFIX}/`)) return;

  const nome = path.basename(url);
  try {
    await unlink(path.join(UPLOAD_DIR, nome));
  } catch {
    // Arquivo já removido: apagar o registro no banco é o que importa.
  }
}
