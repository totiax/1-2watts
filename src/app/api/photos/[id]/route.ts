import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { db, isSubmitted, UPLOADS_DIR, type PhotoRow } from "@/lib/db";
import { stageOf } from "@/lib/event";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

const notFound = () => ({ error: NextResponse.json({ error: "No encontrada" }, { status: 404 }) });

async function findPhoto(ctx: RouteContext<"/api/photos/[id]">) {
  const member = await getCurrentMember();
  if (!member) return { error: NextResponse.json({ error: "Sin sesión" }, { status: 401 }) };
  const { id } = await ctx.params;
  const photo = db().prepare("SELECT * FROM photos WHERE id = ?").get(id) as PhotoRow | undefined;
  return { member, photo };
}

/**
 * Ver: las tuyas siempre. Las de las consignas de los demás, solo si los dos ya
 * enchufaron (son las del inicio). La selfie y el escrache no se comparten.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/photos/[id]">) {
  const { member, photo, error } = await findPhoto(ctx);
  if (error) return error;
  const own = photo?.member_id === member.id;
  const shared = !!photo && photo.kind !== "selfie" && photo.kind !== "escrache" && isSubmitted(member.id) && isSubmitted(photo.member_id);
  if (!photo || !(own || shared)) return notFound().error;
  const data = await readFile(path.join(UPLOADS_DIR, photo.file));
  return new NextResponse(data, {
    headers: {
      "Content-Type": TYPES[path.extname(photo.file).slice(1)] ?? "application/octet-stream",
      "Cache-Control": "private, no-store",
    },
  });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/photos/[id]">) {
  const { member, photo, error } = await findPhoto(ctx);
  if (error) return error;
  if (!photo || photo.member_id !== member.id) return notFound().error;
  if (stageOf(member.id) !== "carga") {
    return NextResponse.json({ error: "La carga está cerrada." }, { status: 403 });
  }
  db().prepare("DELETE FROM photos WHERE id = ?").run(photo.id);
  await unlink(path.join(UPLOADS_DIR, photo.file)).catch(() => {});
  return NextResponse.json({ ok: true });
}
