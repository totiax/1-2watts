import "server-only";
import { createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { envValue } from "./env-value";

/**
 * Contraseñas. Cada persona puede tener la suya en data/equipo.json ("clave");
 * si no tiene, usa la compartida del equipo, que en .env.local va solo como hash:
 *   LOGIN_PASSWORD_HASH=scrypt:<salt>:<hash>   (generarlo con `npm run password -- '<clave>'`)
 */
export function passwordConfigured(own?: string) {
  return Boolean(own || envValue("LOGIN_PASSWORD_HASH"));
}

/** Si la clave compartida tiene forma válida (para /api/estado; no dice cuál es). */
export function sharedHashLooksValid() {
  const [algo, salt, hash] = envValue("LOGIN_PASSWORD_HASH").split(":");
  return algo === "scrypt" && Boolean(salt) && Buffer.from(hash ?? "", "base64url").length === 32;
}

function matchesHash(password: string, stored: string) {
  const [algo, salt, hash] = stored.split(":");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

/** `own` es la clave propia de la persona (en claro o "scrypt:…"), si tiene. */
export function checkPassword(password: string, own?: string): boolean {
  if (own) {
    if (own.startsWith("scrypt:")) return matchesHash(password, own);
    // Clave en claro: se compara hasheando las dos para no filtrar el largo por tiempos.
    const a = createHash("sha256").update(password).digest();
    const b = createHash("sha256").update(own).digest();
    return timingSafeEqual(a, b);
  }
  return matchesHash(password, envValue("LOGIN_PASSWORD_HASH"));
}

// ── Límite de intentos (en memoria: alcanza para un solo servidor) ─────────

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;
type G = typeof globalThis & { __mwAttempts?: Map<string, { n: number; since: number }> };

function attempts() {
  const g = globalThis as G;
  g.__mwAttempts ??= new Map();
  return g.__mwAttempts;
}

/** Devuelve false si esa clave (mail o IP) ya agotó los intentos. */
export function allowAttempt(key: string): boolean {
  const map = attempts();
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || now - entry.since > WINDOW_MS) {
    map.set(key, { n: 1, since: now });
    return true;
  }
  entry.n += 1;
  return entry.n <= MAX_ATTEMPTS;
}

export function clearAttempts(key: string) {
  attempts().delete(key);
}
