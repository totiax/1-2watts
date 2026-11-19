"use client";

import { useState } from "react";

export type Step = { id: string; label: string; title: string; hint: string; done: boolean; panel: React.ReactNode };

/**
 * La carga en una sola pantalla: los pasos se ven de a uno y se pasa con las
 * pestañas o con Anterior/Siguiente. Los paneles quedan montados (ocultos)
 * para que los campos de texto sigan dentro del formulario de respuestas.
 */
export function Wizard({ steps, finish }: { steps: Step[]; finish: React.ReactNode }) {
  const firstPending = steps.findIndex((s) => !s.done);
  const [current, setCurrent] = useState(Math.max(firstPending, 0));
  const step = steps[current];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <ol className="grid grid-cols-3 gap-2" aria-label="Pasos">
        {steps.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => setCurrent(i)}
              aria-current={i === current ? "step" : undefined}
              className={`flex w-full items-center gap-2 border-b-2 pb-2 text-left transition-colors ${
                i === current ? "border-volt text-paper" : "border-line text-muted hover:text-paper"
              }`}
            >
              <span
                aria-hidden
                className={`hidden size-5 shrink-0 place-items-center rounded-full font-mono sm:grid text-[10px] font-bold ${
                  s.done ? "bg-volt text-ink" : i === current ? "border border-volt text-volt" : "border border-line"
                }`}
              >
                {s.done ? "✓" : i + 1}
              </span>
              <span
                className={`truncate font-mono text-[11px] uppercase tracking-wide sm:text-xs sm:tracking-[0.15em] ${
                  s.done ? "text-volt sm:text-inherit" : ""
                }`}
              >
                {s.label}
              </span>
              <span className="sr-only">{s.done ? " (listo)" : ""}</span>
            </button>
          </li>
        ))}
      </ol>

      <header className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-bold leading-tight sm:text-3xl">{step.title}</h2>
        <p className="max-w-2xl text-sm text-muted">{step.hint}</p>
      </header>

      <div className="relative min-h-0 flex-1">
        {steps.map((s, i) => (
          <section key={s.id} hidden={i !== current} aria-label={s.title} className="absolute inset-0 flex flex-col">
            {s.panel}
          </section>
        ))}
      </div>

      <footer className="flex items-center justify-between border-t border-line pt-3">
        <button
          type="button"
          onClick={() => setCurrent((c) => c - 1)}
          disabled={current === 0}
          className="font-mono text-xs uppercase tracking-widest text-muted hover:text-paper disabled:invisible"
        >
          ← Anterior
        </button>
        {current === steps.length - 1 ? (
          finish
        ) : (
          <button
            type="button"
            onClick={() => setCurrent((c) => c + 1)}
            className="inline-flex h-10 items-center rounded-full border border-volt/60 px-5 font-mono text-xs font-bold uppercase tracking-widest text-volt transition-colors hover:bg-volt hover:text-ink"
          >
            {steps[current + 1].label} →
          </button>
        )}
      </footer>
    </div>
  );
}
