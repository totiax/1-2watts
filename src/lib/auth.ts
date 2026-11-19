import "server-only";
import { redirect } from "next/navigation";
import { envValue } from "./env-value";
import { readSession } from "./session";
import { findMemberById, type Member } from "./roster";

/**
 * Por ahora la app está abierta: se entra sin login, como visitante, para que
 * el equipo vea el desarrollo. Con LOGIN=on vuelve a pedir mail y contraseña.
 */
export function loginRequired() {
  return envValue("LOGIN").toLowerCase() === "on";
}

export const GUEST_ID = "invitado";

const GUEST: Member = { id: GUEST_ID, emails: [], firstName: "visitante", lastName: "", nickname: null };

export function isGuest(m: Member) {
  return m.id === GUEST_ID;
}

/** Capa de acceso: devuelve la persona logueada, el visitante (sin login) o null. */
export async function getCurrentMember(): Promise<Member | null> {
  const session = await readSession();
  const member = session ? findMemberById(session.memberId) : undefined;
  if (member) return member;
  return loginRequired() ? null : GUEST;
}

/** Igual que getCurrentMember, pero manda al inicio si no hay sesión válida. */
export async function requireMember(): Promise<Member> {
  const member = await getCurrentMember();
  if (!member) redirect("/?error=sesion");
  return member;
}
