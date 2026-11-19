import "server-only";
import { scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Contraseña compartida del equipo. En .env.local va solo el hash:
 *   LOGIN_PASSWORD_HASH=scrypt:<salt>:<hash>   (generarlo con `npm run password -- '<clave>'`)
 */
export function passwordConfigured() {
  return Boolean(process.env.LOGIN_PASSWORD_HASH);
}

export function checkPassword(password: string): boolean {
  const stored = process.env.LOGIN_PASSWORD_HASH ?? "";
  const [algo, salt, hash] = stored.split(":");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
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
