"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PLAYLISTS } from "@/lib/playlists";
import { sound, type MusicChoice, type MusicState } from "@/lib/sound";

const OPTIONS: { id: MusicChoice; label: string }[] = [{ id: "none", label: "Sin música (aburrido)" }, ...PLAYLISTS];

/**
 * La pastilla de música: elegir lista, play/pausa, anterior, siguiente y
 * volumen. El panel se abre hacia arriba con la canción que suena.
 */
export function MusicSelect({ className = "" }: { className?: string }) {
  const [state, setState] = useState<MusicState | null>(null);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => sound().subscribe(setState), []);

  // El navegador no deja sonar nada sin un gesto: la música arranca con el
  // primer click o tecla en la página (salvo que se haya elegido "Sin música").
  useEffect(() => {
    const kick = (e: Event) => {
      sound().unlock();
      // Si la intro está corriendo, ella arranca la música cuando aparece el ½.
      if (document.documentElement.dataset.intro === "playing") return;
      // Si el primer toque fue sobre la pastilla, que decida ella.
      if (root.current?.contains(e.target as Node)) return;
      void sound().start();
    };
    window.addEventListener("pointerdown", kick, { once: true });
    window.addEventListener("keydown", kick, { once: true });
    return () => {
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
  }, []);

  // Cierra al hacer click afuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!state) return null;
  const current = OPTIONS.find((o) => o.id === state.choice) ?? OPTIONS[0];
  const on = state.choice !== "none";

  return (
    <div ref={root} className={`font-mono text-xs ${className}`}>
      {open && (
        <div
          id={panelId}
          className="absolute bottom-full right-0 mb-2 flex w-72 flex-col gap-3 rounded-2xl border border-line bg-ink-2 p-3 shadow-2xl shadow-black/60"
        >
          {on && (
            <div className="flex flex-col gap-3 px-1 pt-1">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
                  {state.playing ? "Sonando" : "En pausa"}
                </span>
                <p className="line-clamp-2 font-sans text-sm text-paper">{state.title ?? "…"}</p>
              </div>
              <label className="flex items-center gap-2 text-muted">
                <span aria-hidden>{state.volume === 0 ? "🔇" : state.volume < 0.5 ? "🔉" : "🔊"}</span>
                <span className="sr-only">Volumen</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(state.volume * 100)}
                  onChange={(e) => sound().setVolume(Number(e.currentTarget.value) / 100)}
                  className="h-1 flex-1 cursor-pointer accent-volt"
                />
                <span className="w-8 text-right tabular-nums">{Math.round(state.volume * 100)}</span>
              </label>
              <div role="radiogroup" aria-label="Orden" className="grid grid-cols-2 gap-1 rounded-full bg-ink p-1">
                {[
                  { shuffle: true, label: "Aleatorio" },
                  { shuffle: false, label: "En orden" },
                ].map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    role="radio"
                    aria-checked={state.shuffle === m.shuffle}
                    onClick={() => sound().setShuffle(m.shuffle)}
                    className={`rounded-full py-1.5 transition-colors ${
                      state.shuffle === m.shuffle ? "bg-line text-paper" : "text-muted hover:text-paper"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div role="radiogroup" aria-label="Lista" className={`flex flex-col ${on ? "border-t border-line pt-2" : ""}`}>
            {OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={o.id === state.choice}
                onClick={() => {
                  sound().unlock();
                  // Elegir una lista la hace sonar (aunque ya estuviera elegida y en pausa).
                  if (o.id !== state.choice) sound().choose(o.id);
                  else if (!state.playing) void sound().start();
                }}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-line"
              >
                <span className={o.id === state.choice ? "text-paper" : "text-paper/70"}>{o.label}</span>
                {o.id === state.choice && <span className="text-volt">●</span>}
              </button>
            ))}
          </div>

          {state.error && (
            <p role="alert" className="px-1 font-sans text-xs text-warn">
              {state.error}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-0.5 rounded-full border border-line bg-ink-2/90 p-1.5 backdrop-blur">
        <button
          ref={button}
          type="button"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-full py-1 pl-2.5 pr-2 text-paper hover:bg-line focus-visible:outline-volt"
        >
          <Equalizer on={state.playing} />
          <span className="sr-only">Música: </span>
          {current.label}
          <span aria-hidden className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}>
            ▴
          </span>
        </button>

        {on && (
          <>
            <Control label="Anterior" onClick={() => void sound().prev()}>
              <path d="M6 5h2v14H6zM20 5v14L9 12z" />
            </Control>
            <button
              type="button"
              onClick={() => {
                sound().unlock();
                sound().toggle();
              }}
              aria-label={state.playing ? "Pausar" : "Reproducir"}
              className="grid size-7 place-items-center rounded-full bg-volt text-ink"
            >
              <svg viewBox="0 0 24 24" className="size-3.5 fill-current" aria-hidden>
                {state.playing ? <path d="M6 5h4v14H6zM14 5h4v14h-4z" /> : <path d="M7 4v16l13-8z" />}
              </svg>
            </button>
            <Control label="Siguiente" onClick={() => void sound().next()}>
              <path d="M16 5h2v14h-2zM4 5v14l11-7z" />
            </Control>
          </>
        )}
      </div>
    </div>
  );
}

function Control({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => {
        sound().unlock();
        onClick();
      }}
      aria-label={label}
      className="grid size-7 place-items-center rounded-full text-paper/80 hover:bg-line hover:text-paper"
    >
      <svg viewBox="0 0 24 24" className="size-3.5 fill-current" aria-hidden>
        {children}
      </svg>
    </button>
  );
}

/** Tres barritas que bailan mientras suena algo. */
function Equalizer({ on }: { on: boolean }) {
  return (
    <span aria-hidden className="flex h-3 items-end gap-[2px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`w-[3px] origin-bottom rounded-sm bg-volt ${on ? "animate-[eq_0.9s_ease-in-out_infinite]" : "h-1 opacity-50"}`}
          style={on ? { animationDelay: `${i * 0.15}s`, height: "100%" } : undefined}
        />
      ))}
    </span>
  );
}
