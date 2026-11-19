"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { allowAttempt, checkPassword, clearAttempts, passwordConfigured } from "@/lib/password";
import { findMemberByEmail } from "@/lib/roster";
import { createSession } from "@/lib/session";

export type LoginState = { error: string; email: string } | null;

export async function loginWithPassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(formData.get("password") ?? "").slice(0, 200);

  if (!email || !password) return { error: "Completá el mail y la contraseña.", email };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowAttempt(`mail:${email}`) || !allowAttempt(`ip:${ip}`)) {
    return { error: "Demasiados intentos. Esperá unos minutos y probá de nuevo.", email };
  }

  // Mismo mensaje si el mail no está o la clave no coincide: no revela quién es del equipo.
  const member = findMemberByEmail(email);
  if (member && !passwordConfigured(member.password)) {
    return { error: "El login con contraseña todavía no está configurado.", email };
  }
  if (!member || !checkPassword(password, member.password)) {
    return { error: "Mail o contraseña incorrectos.", email };
  }

  clearAttempts(`mail:${email}`);
  await createSession(member.id);
  redirect("/inicio");
}
