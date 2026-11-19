import { NextResponse } from "next/server";
import { tracksOf } from "@/lib/music";
import { isPlaylistId } from "@/lib/playlists";

/** Los títulos de una lista. La música suena también sin iniciar sesión. */
export async function GET(_req: Request, ctx: RouteContext<"/api/music/[playlist]">) {
  const { playlist } = await ctx.params;
  if (!isPlaylistId(playlist)) return NextResponse.json({ error: "No existe" }, { status: 404 });
  const tracks = await tracksOf(playlist);
  return NextResponse.json(
    { tracks: tracks.map((t) => t.title) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
