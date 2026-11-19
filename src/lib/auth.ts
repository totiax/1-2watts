import "server-only";
import { redirect } from "next/navigation";
import { readSession } from "./session";
import { findMemberById, type Member } from "./roster";

/** Capa de acceso: devuelve la persona logueada o null. */
export async function getCurrentMember(): Promise<Member | null> {
  const session = await readSession();
  if (!session) return null;
  return findMemberById(session.memberId) ?? null;
}

/** Igual que getCurrentMember, pero manda al inicio si no hay sesión válida. */
export async function requireMember(): Promise<Member> {
  const member = await getCurrentMember();
  if (!member) redirect("/?error=sesion");
  return member;
}
