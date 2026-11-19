/**
 * Las listas del selector de música. Las canciones son archivos locales en
 * storage/music (fuera del repo); ver lib/music.ts para qué carpetas usa cada una.
 */
export const PLAYLISTS = [
  { id: "cheta", label: "Cheta" },
  { id: "mix", label: "Mix" },
  { id: "cuarteto", label: "Cuarteto" },
] as const;

export type PlaylistId = (typeof PLAYLISTS)[number]["id"];

export function isPlaylistId(v: unknown): v is PlaylistId {
  return typeof v === "string" && PLAYLISTS.some((p) => p.id === v);
}
