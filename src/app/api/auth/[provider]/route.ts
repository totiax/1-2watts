import { generateCodeVerifier, generateState } from "arctic";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getClient, isConfigured, isProvider, SCOPES } from "@/lib/oauth";

/** Arranca el login: guarda state + PKCE en cookies cortas y manda al proveedor. */
export async function GET(request: Request, ctx: RouteContext<"/api/auth/[provider]">) {
  const { provider } = await ctx.params;
  if (!isProvider(provider)) return new NextResponse("Proveedor desconocido", { status: 404 });
  if (!isConfigured(provider)) {
    return NextResponse.redirect(new URL("/?error=sin-config", request.url));
  }

  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = getClient(provider).createAuthorizationURL(state, verifier, SCOPES);
  if (provider === "google") url.searchParams.set("prompt", "select_account");

  const jar = await cookies();
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10,
  };
  jar.set(`oauth_state_${provider}`, state, opts);
  jar.set(`oauth_verifier_${provider}`, verifier, opts);

  return NextResponse.redirect(url);
}
