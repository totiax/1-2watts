import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { AUDIO_TYPES, tracksOf } from "@/lib/music";
import { isPlaylistId } from "@/lib/playlists";

/**
 * Una canción, en streaming y con soporte de Range para que el navegador
 * pueda adelantar sin bajarse el archivo entero.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/music/[playlist]/[track]">) {
  const { playlist, track } = await ctx.params;
  if (!isPlaylistId(playlist) || !/^\d+$/.test(track)) return NextResponse.json({ error: "No existe" }, { status: 404 });
  const file = (await tracksOf(playlist))[Number(track)]?.file;
  if (!file) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const { size } = await stat(file);
  const headers: Record<string, string> = {
    "Content-Type": AUDIO_TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    // "bytes=100-" (desde 100), "bytes=100-199" o "bytes=-500" (los últimos 500).
    let start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    end = Math.min(end, size - 1);
    if (start > end || start >= size) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    start = Math.max(0, start);
    const body = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new NextResponse(body, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }

  const body = Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new NextResponse(body, { headers: { ...headers, "Content-Length": String(size) } });
}
