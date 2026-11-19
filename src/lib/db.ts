import "server-only";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { PhotoKind } from "./questions";
import { migrate } from "./schema";

/**
 * Base y fotos. En Vercel el disco es de solo lectura salvo /tmp, que se borra
 * seguido: alcanza para ver el desarrollo, no para el evento real.
 */
export const STORAGE_DIR =
  process.env.STORAGE_DIR || (process.env.VERCEL ? "/tmp/medio-watts" : path.join(process.cwd(), "storage"));
export const UPLOADS_DIR = path.join(STORAGE_DIR, "uploads");

type G = typeof globalThis & { __mwDb?: Database.Database };

function open() {
  mkdirSync(UPLOADS_DIR, { recursive: true });
  const db = new Database(path.join(STORAGE_DIR, "medio-watts.db"));
  db.pragma("journal_mode = WAL");
  migrate(db);
  return db;
}

// Reutiliza la conexión entre recargas de dev.
export function db() {
  const g = globalThis as G;
  g.__mwDb ??= open();
  return g.__mwDb;
}

export type PhotoRow = {
  id: string;
  member_id: string;
  kind: PhotoKind;
  file: string;
  width: number | null;
  height: number | null;
  created_at: string;
};

export function photosOf(memberId: string): PhotoRow[] {
  return db()
    .prepare("SELECT * FROM photos WHERE member_id = ? ORDER BY created_at")
    .all(memberId) as PhotoRow[];
}

export function answersOf(memberId: string): Record<string, string> {
  const rows = db()
    .prepare("SELECT question_id, answer FROM answers WHERE member_id = ?")
    .all(memberId) as { question_id: string; answer: string }[];
  return Object.fromEntries(rows.map((r) => [r.question_id, r.answer]));
}

export function isSubmitted(memberId: string): boolean {
  return Boolean(db().prepare("SELECT 1 FROM submissions WHERE member_id = ?").get(memberId));
}

export function submittedIds(): Set<string> {
  const rows = db().prepare("SELECT member_id FROM submissions").all() as { member_id: string }[];
  return new Set(rows.map((r) => r.member_id));
}

/** Los votos de una persona: categoría → id del votado. */
export function votesOf(memberId: string): Record<string, string> {
  const rows = db()
    .prepare("SELECT award_id, nominee_id FROM votes WHERE voter_id = ?")
    .all(memberId) as { award_id: string; nominee_id: string }[];
  return Object.fromEntries(rows.map((r) => [r.award_id, r.nominee_id]));
}
