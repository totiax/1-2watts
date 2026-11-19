"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export type Shot = { photoId: string; emoji: string; title: string; text: string };
export type Teammate = { id: string; name: string; on: boolean; me: boolean; shots: Shot[] };

/**
 * Los nombres del equipo: en verde los que enchufaron. Tocando a alguien que
 * enchufó se abren sus fotos (mascota, fiesta y viaje) con lo que contestó.
 */
export function Team({ team }: { team: Teammate[] }) {
  const [open, setOpen] = useState<Teammate | null>(null);
  const pending = team.filter((p) => !p.on);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap justify-center gap-2 lg:justify-start" aria-label="Quiénes enchufaron">
        {team.map((p) => {
          const inner = (
            <>
              <span
                aria-hidden
                className={`grid size-7 place-items-center rounded-full font-mono text-xs font-bold ${
                  p.on ? "bg-volt text-ink" : "bg-line text-muted"
                }`}
              >
                {p.name.slice(0, 1)}
              </span>
              {p.name}
              {p.me && <span className="font-mono text-[10px] uppercase text-volt">vos</span>}
            </>
          );
          return (
            <li key={p.id} data-chip>
              {p.on && p.shots.length ? (
                <button
                  type="button"
                  onClick={() => setOpen(p)}
                  aria-label={`Ver las fotos de ${p.name}`}
                  className="flex items-center gap-2 rounded-full border border-volt/50 py-1 pl-1 pr-3 text-sm text-paper transition-colors hover:border-volt hover:bg-volt/10"
                >
                  {inner}
                </button>
              ) : (
                <span className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 text-sm text-muted">
                  {inner}
                  <span className="sr-only"> (falta enchufar)</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {pending.length > 0 && (
        <p className="text-center text-sm text-muted lg:text-left">
          🪫 Esperando a <span className="text-paper">{pending.map((p) => p.name).join(", ")}</span>…
        </p>
      )}
      {open && <Photos person={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** Las fotos de una persona como polaroids que caen sobre la mesa. */
function Photos({ person, onClose }: { person: Teammate; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".polaroid", {
          y: -80,
          rotation: (i) => [14, -10, 12][i % 3],
          autoAlpha: 0,
          duration: 0.6,
          ease: "back.out(1.6)",
          stagger: 0.08,
          clearProps: "transform",
        });
      });
    },
    { scope: dialog },
  );

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      aria-label={`Fotos de ${person.name}`}
      className="m-auto max-h-none w-[min(64rem,calc(100vw-2rem))] max-w-none bg-transparent p-0 text-paper backdrop:bg-ink/90 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-6 p-4">
        <header className="flex items-center justify-between">
          <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
            Las fotos de <span className="text-volt">{person.name}</span>
          </h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="rounded-full bg-paper px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-ink"
          >
            Cerrar
          </button>
        </header>
        <ul className="grid gap-6 sm:grid-cols-3">
          {person.shots.map((s, i) => (
            <li
              key={s.photoId}
              style={{ "--r": `${[-3, 2, -1.5][i % 3]}deg` } as React.CSSProperties}
              className="polaroid rounded-[3px] bg-paper p-2.5 pb-3 text-ink shadow-[0_16px_40px_-12px_rgba(0,0,0,.9)] [rotate:var(--r)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- fotos privadas servidas por la API */}
              <img src={`/api/photos/${s.photoId}`} alt={s.text || s.title} className="block aspect-square w-full object-cover" />
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/55">
                {s.emoji} {s.title}
              </p>
              <p className="mt-1 font-hand text-2xl leading-[1.05]">{s.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}
