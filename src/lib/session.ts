import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { envValue } from "./env-value";

const COOKIE = "mw_session";
const MAX_AGE_DAYS = 30;

function key() {
  const secret = envValue("SESSION_SECRET");
  if (!secret || secret.length < 32) {
    throw new Error("Falta SESSION_SECRET (mínimo 32 caracteres). Ver .env.example");
  }
  return new TextEncoder().encode(secret);
}

/** El payload lleva solo el id de People: nada de mails ni datos personales. */
export type SessionPayload = { memberId: string };

export async function createSession(memberId: string) {
  const expires = new Date(Date.now() + MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  const token = await new SignJWT({ memberId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return typeof payload.memberId === "string" ? { memberId: payload.memberId } : null;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE);
}

export const SESSION_COOKIE = COOKIE;
