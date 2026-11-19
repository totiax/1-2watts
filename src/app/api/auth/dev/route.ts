import { NextResponse } from "next/server";
import { findMemberByEmail } from "@/lib/roster";
import { createSession } from "@/lib/session";

/**
 * Login de prueba sin OAuth. Solo existe con `next dev` y no tiene botón:
 * /api/auth/dev?email=nombre.apellido@25watts.com.ar
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") return new NextResponse(null, { status: 404 });
  const email = new URL(request.url).searchParams.get("email") ?? "";
  const member = findMemberByEmail(email);
  if (!member) return NextResponse.redirect(new URL("/?error=fuera-del-equipo", request.url));
  await createSession(member.id);
  return NextResponse.redirect(new URL("/inicio", request.url));
}
