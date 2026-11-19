/**
 * Genera el valor de LOGIN_PASSWORD_HASH para .env.local.
 *   npm run password -- 'la-clave'
 */
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error("Uso: npm run password -- 'la-clave'");
  process.exit(1);
}
const salt = randomBytes(16).toString("base64url");
const hash = scryptSync(password, salt, 32).toString("base64url");
console.log(`LOGIN_PASSWORD_HASH=scrypt:${salt}:${hash}`);
