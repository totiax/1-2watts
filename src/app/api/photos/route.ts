import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { db, UPLOADS_DIR, type PhotoRow } from "@/lib/db";
import { isPhotoKind } from "@/lib/questions";
import { stageOf } from "@/lib/event";

const MAX_BYTES = 8 * 1024 * 1024;

/** Detecta el tipo por los primeros bytes, no por lo que diga el navegador. */
function sniff(buf: Buffer): "jpg" | "png" | "webp" | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "webp";
  return null;
}

export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "Tenés que iniciar sesión." }, { status: 401 });
  if (stageOf(member.id) !== "carga") {
    return NextResponse.json({ error: "La carga está cerrada." }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind");
  if (!(file instanceof File) || !isPhotoKind(kind)) {
    return NextResponse.json({ error: "Falta la foto." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "La foto pesa más de 8 MB." }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniff(buf);
  if (!ext) return NextResponse.json({ error: "Solo JPG, PNG o WebP." }, { status: 415 });

  const width = Number(form?.get("width")) || null;
  const height = Number(form?.get("height")) || null;
  const database = db();

  const id = randomUUID();
  const rel = path.join(member.id, `${id}.${ext}`);
  await mkdir(path.join(UPLOADS_DIR, member.id), { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, rel), buf);

  // Una foto por consigna: la nueva reemplaza a la anterior.
  const old = database
    .prepare("SELECT * FROM photos WHERE member_id = ? AND kind = ?")
    .all(member.id, kind) as PhotoRow[];
  for (const p of old) {
    database.prepare("DELETE FROM photos WHERE id = ?").run(p.id);
    await unlink(path.join(UPLOADS_DIR, p.file)).catch(() => {});
  }

  database
    .prepare("INSERT INTO photos (id, member_id, kind, file, width, height) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, member.id, kind, rel, width, height);

  return NextResponse.json({ id, kind });
}
