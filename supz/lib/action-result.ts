/**
 * Retorno padrão das Server Actions. Erros previsíveis (e-mail já cadastrado,
 * cupom inválido) voltam como dados; só o inesperado vira exceção.
 */
export type ActionResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { data: T }))
  | { ok: false; message: string; field?: string };

export function failure(message: string, field?: string): ActionResult<never> {
  return { ok: false, message, field };
}
