import { decodeIdToken } from "arctic";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { emailFromClaims, getClient, isProvider } from "@/lib/oauth";
import { findMemberByEmail } from "@/lib/roster";
import { createSession } from "@/lib/session";

export async function GET(request: Request, ctx: RouteContext<"/api/auth/[provider]/callback">) {
  const { provider } = await ctx.params;
  const home = (error: string) => NextResponse.redirect(new URL(`/?error=${error}`, request.url));
  if (!isProvider(provider)) return home("proveedor");

  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const state = params.get("state");

  const jar = await cookies();
  const savedState = jar.get(`oauth_state_${provider}`)?.value;
  const verifier = jar.get(`oauth_verifier_${provider}`)?.value;
  jar.delete(`oauth_state_${provider}`);
  jar.delete(`oauth_verifier_${provider}`);

  if (!code || !state || !savedState || !verifier || state !== savedState) return home("estado");

  let email: string | null;
  try {
    const tokens = await getClient(provider).validateAuthorizationCode(code, verifier);
    email = emailFromClaims(decodeIdToken(tokens.idToken()) as Record<string, unknown>);
  } catch {
    return home("proveedor");
  }
  if (!email) return home("sin-mail");

  // Solo entra quien está activo en People.
  const member = findMemberByEmail(email);
  if (!member) return home("fuera-del-equipo");

  await createSession(member.id);
  return NextResponse.redirect(new URL("/inicio", request.url));
}
