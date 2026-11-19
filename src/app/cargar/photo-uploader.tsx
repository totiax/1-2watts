"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PhotoKind } from "@/lib/questions";

const MAX_SIDE = 2048;

/** Achica la foto en el navegador a JPEG de 2048px como máximo antes de subirla. */
async function shrink(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`No pude leer “${file.name}”. Si es HEIC, exportala como JPG.`);
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.86));
  if (!blob) throw new Error("No pude procesar la foto.");
  return { blob, width, height };
}

/** Una foto por consigna: subir, ver, cambiar o borrar. */
export function PhotoUploader({
  kind,
  photoId,
  label = "Subir foto",
  selfie = false,
  fill = false,
}: {
  kind: PhotoKind;
  photoId: string | null;
  label?: string;
  selfie?: boolean;
  /** Ocupa todo el alto disponible en vez de tener proporción fija. */
  fill?: boolean;
}) {
  const frame = fill ? "min-h-0 flex-1" : "aspect-[4/3]";
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const { blob, width, height } = await shrink(file);
      const body = new FormData();
      body.set("file", blob, "foto.jpg");
      body.set("kind", kind);
      body.set("width", String(width));
      body.set("height", String(height));
      const res = await fetch("/api/photos", { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo subir la foto.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo falló.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
      startTransition(() => router.refresh());
    }
  }

  async function remove() {
    if (!photoId) return;
    setError(null);
    const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
    if (!res.ok) setError("No se pudo borrar.");
    startTransition(() => router.refresh());
  }

  const picker = (
    <input
      ref={input}
      type="file"
      accept="image/*"
      capture={selfie ? "user" : undefined}
      className="sr-only"
      disabled={busy}
      onChange={(e) => upload(e.target.files)}
    />
  );

  return (
    <div className={`flex flex-col gap-2 ${fill ? "min-h-0 flex-1" : ""}`}>
      {photoId ? (
        <div className={`group relative ${frame} overflow-hidden rounded-xl border border-line bg-ink`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- fotos privadas servidas por la API */}
          <img src={`/api/photos/${photoId}`} alt="" className={`h-full w-full object-cover ${busy ? "opacity-40" : ""}`} />
          <div className="absolute inset-x-2 bottom-2 flex justify-end gap-2 font-mono text-xs">
            <label className="cursor-pointer rounded-full bg-ink/80 px-3 py-1 text-paper backdrop-blur hover:text-volt">
              {busy ? "Subiendo…" : "Cambiar"}
              {picker}
            </label>
            <button
              type="button"
              onClick={remove}
              className="rounded-full bg-ink/80 px-3 py-1 text-paper backdrop-blur hover:text-warn"
            >
              Borrar
            </button>
          </div>
        </div>
      ) : (
        <label
          className={`flex ${frame} cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-center text-sm text-muted transition-colors hover:border-volt hover:text-volt ${
            busy ? "pointer-events-none animate-pulse" : ""
          }`}
        >
          <span className="font-display text-3xl leading-none">+</span>
          <span>{busy ? "Subiendo…" : label}</span>
          {picker}
        </label>
      )}
      {error && (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      )}
    </div>
  );
}
