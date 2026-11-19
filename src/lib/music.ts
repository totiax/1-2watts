import "server-only";
import { readdir } from "node:fs/promises";
import path from "node:path";
import type { PlaylistId } from "./playlists";

/** Las canciones viven en storage/music, que está en .gitignore: no se suben al repo. */
export const MUSIC_DIR = path.join(process.cwd(), "storage", "music");

/** Qué carpetas de storage/music arman cada lista. */
const FOLDERS: Record<PlaylistId, string[]> = {
  cheta: ["YouTube Mix - SG Lewis"],
  mix: ["YouTube Mix - Cumbia y Reggaeton"],
  cuarteto: ["YouTube Mix - Cuarteto"],
};

export const AUDIO_TYPES: Record<string, string> = {
  ".m4a": "audio/mp4",
  ".mp4": "audio/mp4",
  ".aac": "audio/aac",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".opus": "audio/ogg",
  ".webm": "audio/webm",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
};

export type Track = { file: string; title: string };

/** "07 - Rombai - Me Voy (Official Video).m4a" → "Rombai - Me Voy" */
function titleOf(file: string) {
  return path
    .basename(file, path.extname(file))
    .replace(/^\d+\s*-\s*/, "")
    .replace(/[(\[][^)\]]*(video|oficial|official|lyric|audio|visuali[sz]er)[^)\]]*[)\]]/gi, "")
    .replace(/\s*｜\s*/g, " - ")
    .replace(/\s+-\s+(video|audio)\s+(oficial|official)\s*$/i, "")
    .replace(/⧸/g, "/")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Las canciones de una lista, en orden de carpeta y nombre. */
export async function tracksOf(id: PlaylistId): Promise<Track[]> {
  const tracks: Track[] = [];
  for (const folder of FOLDERS[id]) {
    const dir = path.join(MUSIC_DIR, folder);
    const files = await readdir(dir).catch(() => [] as string[]);
    for (const f of files.sort((a, b) => a.localeCompare(b, "es", { numeric: true }))) {
      if (AUDIO_TYPES[path.extname(f).toLowerCase()]) tracks.push({ file: path.join(dir, f), title: titleOf(f) });
    }
  }
  return tracks;
}
