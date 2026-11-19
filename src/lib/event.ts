import "server-only";
import { AWARDS, YEAR_AWARDS } from "./awards";
import { answersOf, isSubmitted, photosOf, votesOf } from "./db";
import { PROMPTS, ESCRACHE_WHO } from "./questions";

const DAY = 24 * 60 * 60 * 1000;
const TZ = "America/Argentina/Buenos_Aires";

/** Cuántos días antes de la fiesta sale el mail y se abre la carga. */
export const UPLOAD_DAYS = 5;

/** La fiesta. Se configura con EVENT_DATE (ISO con zona horaria). */
export function eventDate(): Date {
  const raw = process.env.EVENT_DATE ?? "2026-12-11T20:00:00-03:00";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error(`EVENT_DATE inválida: ${raw}`);
  return date;
}

/** El día que llega el mail: desde ahí se puede cargar. */
export function uploadOpensAt(): Date {
  return new Date(eventDate().getTime() - UPLOAD_DAYS * DAY);
}

/** Después de la fiesta se revela quién escribió cada post-it. */
export function isRevealed(now = Date.now()) {
  return now >= eventDate().getTime();
}

/**
 * En qué momento está cada persona:
 * - antes: todavía no salió el mail, no hay nada para hacer.
 * - carga: ventana abierta y todavía no enchufó → solo ve la pantalla de carga.
 * - listo: ya enchufó → entra al inicio (y no vuelve a la carga).
 * - tarde: no enchufó a tiempo → no entra.
 */
export type Stage = "antes" | "carga" | "listo" | "tarde";

export function stageOf(memberId: string, now = Date.now()): Stage {
  if (isSubmitted(memberId)) return "listo";
  if (now < uploadOpensAt().getTime()) return "antes";
  if (now < eventDate().getTime()) return "carga";
  return "tarde";
}

/** Lo que le falta a alguien para poder enchufar. */
export function progressOf(memberId: string) {
  const photos = photosOf(memberId);
  const answers = answersOf(memberId);
  const kinds = new Set(photos.map((p) => p.kind));
  // Cada consigna cuenta cuando tiene foto y respuesta.
  // El escrache además tiene que decir de quién es.
  const prompts = PROMPTS.filter(
    (p) => kinds.has(p.id) && answers[p.id]?.trim() && (p.id !== "escrache" || answers[ESCRACHE_WHO]),
  ).length;
  const selfie = kinds.has("selfie");
  const myVotes = votesOf(memberId);
  // Cada premio cuenta cuando está votado (equipo) o escrito (del año).
  const votes =
    AWARDS.filter((a) => myVotes[a.id]).length + YEAR_AWARDS.filter((a) => answers[a.id]?.trim()).length;
  return {
    prompts,
    selfie,
    votes,
    complete: prompts === PROMPTS.length && selfie && votes === AWARDS.length + YEAR_AWARDS.length,
  };
}

/** "viernes 11 de diciembre" */
export function formatDay(date: Date) {
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(date);
}
