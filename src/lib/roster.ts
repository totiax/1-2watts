import "server-only";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

/** Una persona del equipo, exportada desde People (solo empleados activos). */
export type Member = {
  id: string;
  emails: string[];
  firstName: string;
  lastName: string;
  nickname: string | null;
};

const DATA_DIR = path.join(process.cwd(), "data");

let cache: Member[] | null = null;

/**
 * Lee data/roster.json (generado con `npm run roster`). Si no existe,
 * usa data/roster.example.json con gente de prueba para desarrollo.
 */
export function getRoster(): Member[] {
  if (cache) return cache;
  const real = path.join(DATA_DIR, "roster.json");
  const file = existsSync(real) ? real : path.join(DATA_DIR, "roster.example.json");
  const parsed = JSON.parse(readFileSync(file, "utf8")) as Member[];
  cache = parsed.map((m) => ({ ...m, emails: m.emails.map((e) => e.trim().toLowerCase()) }));
  return cache;
}

export function usingExampleRoster() {
  return !existsSync(path.join(DATA_DIR, "roster.json"));
}

export function findMemberByEmail(email: string): Member | undefined {
  const needle = email.trim().toLowerCase();
  return getRoster().find((m) => m.emails.includes(needle));
}

export function findMemberById(id: string): Member | undefined {
  return getRoster().find((m) => m.id === id);
}

export function displayName(m: Member) {
  return m.nickname?.trim() || m.firstName;
}
