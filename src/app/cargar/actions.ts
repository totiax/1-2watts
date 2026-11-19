"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { progressOf, stageOf } from "@/lib/event";
import { isAwardId, YEAR_AWARDS } from "@/lib/awards";
import { ESCRACHE_WHO, MAX_ANSWER, PROMPTS } from "@/lib/questions";
import { findMemberById } from "@/lib/roster";

export type AnswersState = { ok: boolean; message: string } | null;

export async function saveAnswers(_prev: AnswersState, formData: FormData): Promise<AnswersState> {
  const member = await getCurrentMember();
  if (!member) return { ok: false, message: "Se venció la sesión. Volvé a entrar." };
  if (stageOf(member.id) !== "carga") return { ok: false, message: "La carga está cerrada." };

  const upsert = db().prepare(`
    INSERT INTO answers (member_id, question_id, answer) VALUES (?, ?, ?)
    ON CONFLICT (member_id, question_id) DO UPDATE SET answer = excluded.answer, updated_at = datetime('now')
  `);
  const remove = db().prepare("DELETE FROM answers WHERE member_id = ? AND question_id = ?");

  db().transaction(() => {
    for (const q of [...PROMPTS, ...YEAR_AWARDS]) {
      const raw = formData.get(q.id);
      const value = typeof raw === "string" ? raw.trim().slice(0, MAX_ANSWER) : "";
      if (value) upsert.run(member.id, q.id, value);
      else remove.run(member.id, q.id);
    }
    // A quién escrachaste: un compañero del roster que no seas vos.
    const who = formData.get(ESCRACHE_WHO);
    if (typeof who === "string" && who !== member.id && findMemberById(who)) upsert.run(member.id, ESCRACHE_WHO, who);
    else remove.run(member.id, ESCRACHE_WHO);
  })();

  refresh();
  return { ok: true, message: "Guardado. Podés cambiarlas hasta que enchufes." };
}

export type PlugState = { message: string } | null;

/** Enchufar: cierra la carga para siempre y deja entrar al inicio. */
export async function plugIn(// eslint-disable-next-line @typescript-eslint/no-unused-vars -- firma de useActionState
  _prev: PlugState,
): Promise<PlugState> {
  const member = await getCurrentMember();
  if (!member) return { message: "Se venció la sesión. Volvé a entrar." };
  const stage = stageOf(member.id);
  if (stage === "listo") redirect("/inicio");
  if (stage !== "carga") return { message: "La carga está cerrada." };
  if (!progressOf(member.id).complete) return { message: "Todavía te falta algo de la lista." };

  db().prepare("INSERT OR IGNORE INTO submissions (member_id) VALUES (?)").run(member.id);
  redirect("/inicio");
}

/** Votar (o cambiar el voto) en una categoría de los premios. */
export async function castVote(awardId: string, nomineeId: string): Promise<{ ok: boolean }> {
  const member = await getCurrentMember();
  if (!member || stageOf(member.id) !== "carga") return { ok: false };
  if (!isAwardId(awardId) || typeof nomineeId !== "string") return { ok: false };
  if (nomineeId === member.id || !findMemberById(nomineeId)) return { ok: false };

  db()
    .prepare(
      `INSERT INTO votes (voter_id, award_id, nominee_id) VALUES (?, ?, ?)
       ON CONFLICT (voter_id, award_id) DO UPDATE SET nominee_id = excluded.nominee_id, updated_at = datetime('now')`,
    )
    .run(member.id, awardId, nomineeId);
  refresh();
  return { ok: true };
}
