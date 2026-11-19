import { NextResponse, type NextRequest } from "next/server";

/**
 * Chequeo optimista: si no hay cookie de sesión, ni siquiera renderiza las
 * páginas privadas. La verificación real (firma + roster) está en lib/auth.
 */
export function proxy(request: NextRequest) {
  // Sin login (por ahora): pasa todo; ver loginRequired en lib/auth.
  const login = (process.env.LOGIN ?? "").trim().toLowerCase() === "on";
  if (login && !request.cookies.has("mw_session")) {
    // A la API se le contesta con un error, no con la página de login.
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/?error=sesion", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/cargar/:path*", "/inicio/:path*", "/api/photos/:path*"],
};
