import { connection, NextResponse } from "next/server";
import { sharedHashLooksValid } from "@/lib/password";
import { getRoster, rosterSource } from "@/lib/roster";
import { envValue } from "@/lib/env-value";

/**
 * Qué configuración ve el servidor, para diagnosticar un deploy.
 * No muestra mails, claves ni secretos: solo si están y si tienen forma válida.
 */
export async function GET() {
  await connection();
  let personas: number | string;
  try {
    personas = getRoster().length;
  } catch (e) {
    personas = `error: ${(e as Error).message.slice(0, 120)}`;
  }
  return NextResponse.json(
    {
      equipo: rosterSource(),
      personas,
      claveCompartida: envValue("LOGIN_PASSWORD_HASH") ? (sharedHashLooksValid() ? "ok" : "mal pegada") : "falta",
      sessionSecret: envValue("SESSION_SECRET").length >= 32 ? "ok" : envValue("SESSION_SECRET") ? "muy corto" : "falta",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
