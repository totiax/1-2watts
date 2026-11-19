import { createHash } from "node:crypto";

/**
 * Id estable de cada persona, derivado de su mail principal. Así el roster se
 * puede regenerar (desde el seed o desde la base de People) sin perder las
 * fotos y respuestas ya cargadas, y la cookie no lleva el mail en claro.
 */
export function memberIdFor(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16);
}
