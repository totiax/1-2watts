"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ESCRACHE_WHO, MAX_ANSWER, PROMPTS } from "@/lib/questions";
import { saveAnswers, type AnswersState } from "./actions";
import { PhotoUploader } from "./photo-uploader";

const FORM_ID = "respuestas";

/**
 * Las cuatro consignas como tarjetas limpias. Al tocar una se abre una
 * ventana con la foto grande y su pregunta abajo. Los campos quedan siempre
 * montados (dentro del diálogo) porque el formulario guarda todas juntas.
 */
export function PromptCards({
  photos,
  answers,
  people,
}: {
  photos: Record<string, string | null>;
  answers: Record<string, string>;
  people: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<AnswersState, FormData>(saveAnswers, null);
  const [current, setCurrent] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [who, setWho] = useState(answers[ESCRACHE_WHO] ?? "");
  const whoName = people.find((p) => p.id === who)?.name;

  // Elegir a quién se escracha se guarda al toque (cuando el campo oculto ya cambió).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    form.current?.requestSubmit();
  }, [who]);

  function open(i: number) {
    setCurrent(i);
    dialog.current?.showModal();
  }

  return (
    <>
      <ol className="mx-auto grid h-full w-full max-w-4xl grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:content-center">
        {PROMPTS.map((p, i) => {
          const photo = photos[p.id];
          const done = Boolean(photo && answers[p.id] && (p.id !== "escrache" || whoName));
          const surprise = p.id === "escrache";
          return (
            <li key={p.id} className="min-h-0">
              <button
                type="button"
                onClick={() => open(i)}
                className={`group relative flex h-full max-h-80 w-full flex-col justify-end overflow-hidden rounded-2xl border text-left transition-colors md:aspect-[3/4] md:h-auto ${
                  surprise ? "border-volt/50" : "border-line"
                } ${photo ? "" : "border-dashed hover:border-volt"} bg-ink-2`}
              >
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- fotos privadas servidas por la API
                  <img src={`/api/photos/${photo}`} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span
                    aria-hidden
                    className="absolute inset-0 grid place-items-center pb-10 font-display text-4xl text-muted transition-colors group-hover:text-volt"
                  >
                    +
                  </span>
                )}
                <span className="relative flex items-end justify-between gap-2 bg-gradient-to-t from-ink via-ink/80 to-transparent p-3 pt-8">
                  <span className="flex flex-col">
                    <span className="font-display text-base font-bold leading-tight sm:text-lg">
                      {p.title} <span aria-hidden>{p.emoji}</span>
                    </span>
                    {surprise && whoName && <span className="font-mono text-[11px] text-volt">a {whoName}</span>}
                  </span>
                  <span
                    aria-hidden
                    className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      done ? "bg-volt text-ink" : "border border-line text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </span>
                <span className="sr-only">{done ? " (listo)" : " (falta)"}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <dialog
        ref={dialog}
        onClose={() => form.current?.requestSubmit()}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        aria-label="Cargar foto"
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-3xl border border-line bg-ink-2 p-0 text-paper backdrop:bg-ink/85 backdrop:backdrop-blur-sm"
      >
        {PROMPTS.map((p, i) => (
          <div
            key={p.id}
            hidden={i !== current}
            className="flex max-h-[calc(100dvh-2rem)] flex-col gap-4 overflow-y-auto p-5"
          >
            <header className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
                  Foto {i + 1} de {PROMPTS.length}
                </span>
                <h3 className="font-display text-2xl font-bold leading-tight">
                  {p.title} <span aria-hidden>{p.emoji}</span>
                </h3>
                <p className="text-sm text-muted">{p.hint}</p>
              </div>
              <button
                type="button"
                onClick={() => dialog.current?.close()}
                aria-label="Cerrar"
                className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-muted hover:text-paper"
              >
                ✕
              </button>
            </header>

            <div
              className={`flex shrink-0 flex-col ${p.id === "escrache" ? "h-[min(16rem,30dvh)]" : "h-[min(22rem,40dvh)]"}`}
            >
              <PhotoUploader
                kind={p.id}
                photoId={photos[p.id] ?? null}
                label={p.id === "escrache" ? "Subir el escrache" : "Subir foto"}
                fill
              />
            </div>

            {p.id === "escrache" && (
              <div className="flex flex-col gap-2">
                <span className="font-medium">¿A quién escrachás?</span>
                <div role="radiogroup" aria-label="¿A quién escrachás?" className="flex flex-wrap gap-1.5 font-mono text-xs">
                  {people.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      role="radio"
                      aria-checked={who === person.id}
                      onClick={() => setWho(person.id)}
                      className={`rounded-full border px-3 py-1.5 transition-colors ${
                        who === person.id
                          ? "border-volt bg-volt font-bold text-ink"
                          : "border-line text-paper/80 hover:border-paper hover:text-paper"
                      }`}
                    >
                      {person.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="flex flex-col gap-2">
              <span className="font-medium">{p.question}</span>
              <textarea
                form={FORM_ID}
                autoComplete="off"
                name={p.id}
                defaultValue={answers[p.id] ?? ""}
                placeholder={p.placeholder}
                maxLength={MAX_ANSWER}
                rows={2}
                onBlur={(e) => {
                  if (e.currentTarget.value.trim() !== (answers[p.id] ?? "")) e.currentTarget.form?.requestSubmit();
                }}
                className="resize-none rounded-xl border border-line bg-ink px-4 py-3 text-paper placeholder:text-muted/60 focus:border-volt focus:outline-none"
              />
            </label>

            <footer className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrent((c) => c - 1)}
                disabled={i === 0}
                className="font-mono text-xs uppercase tracking-widest text-muted hover:text-paper disabled:invisible"
              >
                ‹ Anterior
              </button>
              <p role="status" className={`text-xs ${state && !state.ok ? "text-warn" : "text-muted"}`}>
                {pending ? "Guardando…" : state && !state.ok ? state.message : "Se guarda solo"}
              </p>
              {i < PROMPTS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrent((c) => c + 1)}
                  className="font-mono text-xs uppercase tracking-widest text-volt hover:text-paper"
                >
                  Siguiente ›
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => dialog.current?.close()}
                  className="rounded-full bg-volt px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-ink"
                >
                  Listo
                </button>
              )}
            </footer>
          </div>
        ))}
      </dialog>

      <form ref={form} id={FORM_ID} action={action} hidden>
        <input type="hidden" name={ESCRACHE_WHO} value={who} />
      </form>
    </>
  );
}
