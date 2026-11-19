import "server-only";
import { Google, MicrosoftEntraId } from "arctic";

export const PROVIDERS = ["google", "microsoft"] as const;
export type Provider = (typeof PROVIDERS)[number];

export function isProvider(value: string): value is Provider {
  return (PROVIDERS as readonly string[]).includes(value);
}

function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function need(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta ${name}. Ver .env.example`);
  return v;
}

export function getClient(provider: Provider) {
  const redirect = `${appUrl()}/api/auth/${provider}/callback`;
  if (provider === "google") {
    return new Google(need("GOOGLE_CLIENT_ID"), need("GOOGLE_CLIENT_SECRET"), redirect);
  }
  return new MicrosoftEntraId(
    process.env.MICROSOFT_TENANT_ID || "common",
    need("MICROSOFT_CLIENT_ID"),
    need("MICROSOFT_CLIENT_SECRET"),
    redirect,
  );
}

export function isConfigured(provider: Provider) {
  return provider === "google"
    ? Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    : Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}

export const SCOPES = ["openid", "profile", "email"];

/** Saca el mail de los claims del id_token (Microsoft a veces lo manda en preferred_username). */
export function emailFromClaims(claims: Record<string, unknown>): string | null {
  for (const k of ["email", "preferred_username", "upn"]) {
    const v = claims[k];
    if (typeof v === "string" && v.includes("@")) return v.toLowerCase();
  }
  return null;
}
