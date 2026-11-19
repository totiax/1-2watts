import "server-only";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/** Una persona del equipo. */
export type Member = {
  id: string;
  emails: string[];
  firstName: string;
  lastName: string;
  nickname: string | null;
  /** Clave propia (en claro o "scrypt:<salt>:<hash>"). Si no tiene, usa la compartida. */
  password?: string;
};

/**
 * Formato de data/equipo.json, pensado para editar a mano:
 *   { "email": "nombre.apellido@25watts.com.ar", "nombre": "Ana", "apellido": "Pérez", "apodo": null, "clave": "opcional" }
 * "email" también puede ser una lista si alguien entra con más de un mail.
 */
type EquipoEntry = {
  email: string | string[];
  nombre: string;
  apellido?: string;
  apodo?: string | null;
  clave?: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const EQUIPO = path.join(DATA_DIR, "equipo.json");
const ROSTER = path.join(DATA_DIR, "roster.json");
const EXAMPLE = path.join(DATA_DIR, "equipo.example.json");

/** Id estable derivado del mail principal: el mismo que usan los scripts de People. */
export function memberIdFor(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16);
}

function fromEquipo(entries: EquipoEntry[]): Member[] {
  return entries.map((e, i) => {
    const emails = (Array.isArray(e.email) ? e.email : [e.email]).map((m) => String(m).trim().toLowerCase());
    if (!emails[0]?.includes("@") || !e.nombre?.trim()) {
      throw new Error(`equipo.json: a la entrada ${i + 1} le falta "email" o "nombre"`);
    }
    return {
      id: memberIdFor(emails[0]),
      emails,
      firstName: e.nombre.trim(),
      lastName: e.apellido?.trim() ?? "",
      nickname: e.apodo?.trim() || null,
      password: e.clave || undefined,
    };
  });
}

function normalize(members: Member[]): Member[] {
  return members.map((m) => ({ ...m, emails: m.emails.map((e) => e.trim().toLowerCase()) }));
}

/** De dónde sale el equipo, en orden: EQUIPO_JSON, data/equipo.json, data/roster.json (People) o el ejemplo. */
function source(): { key: string; load: () => Member[] } {
  const env = process.env.EQUIPO_JSON;
  if (env) return { key: `env:${env.length}`, load: () => fromEquipo(JSON.parse(env)) };
  for (const [file, parse] of [
    [EQUIPO, (raw: string) => fromEquipo(JSON.parse(raw))],
    [ROSTER, (raw: string) => normalize(JSON.parse(raw))],
    [EXAMPLE, (raw: string) => fromEquipo(JSON.parse(raw))],
  ] as const) {
    // Los archivos del equipo se leen en runtime: que Turbopack no rastree todo el proyecto por esto.
    if (existsSync(/*turbopackIgnore: true*/ file)) {
      return {
        key: `${file}:${statSync(/*turbopackIgnore: true*/ file).mtimeMs}`,
        load: () => parse(readFileSync(/*turbopackIgnore: true*/ file, "utf8")),
      };
    }
  }
  return { key: "vacío", load: () => [] };
}

let cache: { key: string; members: Member[] } | null = null;

/** El equipo que puede entrar. Si se edita el JSON, se relee solo (sin reiniciar). */
export function getRoster(): Member[] {
  const src = source();
  if (cache?.key !== src.key) cache = { key: src.key, members: src.load() };
  return cache.members;
}

export function usingExampleRoster() {
  return !process.env.EQUIPO_JSON && !existsSync(EQUIPO) && !existsSync(ROSTER);
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
