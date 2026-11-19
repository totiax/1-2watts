"use client";

import { useRef, useState } from "react";
import { AWARDS, YEAR_AWARDS } from "@/lib/awards";
import { MAX_ANSWER } from "@/lib/questions";
import { castVote } from "./actions";

type Person = { id: string; name: string };

const ALL = [
  ...AWARDS.map((a) => ({ ...a, year: false as const })),
  ...YEAR_AWARDS.map((a) => ({ ...a, year: true as const })),
];

/**
 * Los premios de a uno: los del equipo se votan tocando un nombre (y pasa
 * solo al siguiente); los "del año" se escriben (los campos usan el mismo
 * formulario que las respuestas de las fotos).
 */
export function AwardVotes({
  people,
  initial,
  answers,
}: {
  people: Person[];
  initial: Record<string, string>;
  answers: Record<string, string>;
}) {
  const [votes, setVotes] = useState<Record<string, string>>(initial);
  const [written, setWritten] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(YEAR_AWARDS.map((a) => [a.id, Boolean(answers[a.id])])),
  );
  const firstPending = ALL.findIndex((a) => (a.year ? !written[a.id] : !votes[a.id]));
  const [current, setCurrent] = useState(firstPending === -1 ? 0 : firstPending);
  const [error, setError] = useState<string | null>(null);
  const next = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isDone = (a: (typeof ALL)[number]) => (a.year ? written[a.id] : Boolean(votes[a.id]));

  async function vote(awardId: string, nomineeId: string) {
    const before = votes[awardId];
    setError(null);
    setVotes((v) => ({ ...v, [awardId]: nomineeId }));
    clearTimeout(next.current);
    next.current = setTimeout(() => setCurrent((c) => Math.min(c + 1, ALL.length - 1)), 450);
    const res = await castVote(awardId, nomineeId);
    if (!res.ok) {
      clearTimeout(next.current);
      setVotes((v) => ({ ...v, [awardId]: before }));
      setError("No se pudo guardar el voto. Probá de nuevo.");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Progreso: una rayita por premio, se puede saltar a cualquiera. */}
      <ol className="flex gap-1" aria-label="Premios">
        {ALL.map((a, i) => (
          <li key={a.id} className="flex-1">
            <button
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`${a.title}${isDone(a) ? " (listo)" : ""}`}
              aria-current={i === current ? "true" : undefined}
              className="block w-full py-2"
            >
              <span
                className={`block h-1 rounded-full transition-colors ${
                  i === current ? "bg-paper" : isDone(a) ? "bg-volt" : "bg-line"
                }`}
              />
            </button>
          </li>
        ))}
      </ol>

      <div className="relative min-h-0 flex-1">
        {ALL.map((a, i) => (
          <article
            key={a.id}
            hidden={i !== current}
            className="absolute inset-0 flex flex-col items-center justify-center gap-6 overflow-y-auto text-center"
          >
            <div className="flex flex-col items-center gap-2">
              <span aria-hidden className="text-5xl leading-none sm:text-6xl">
                {a.emoji}
              </span>
              <h3 className="font-display text-3xl font-bold leading-tight sm:text-5xl">{a.title}</h3>
              <p className="text-muted">{"hint" in a ? a.hint : "Escribí tu candidato"}</p>
            </div>

            {a.year ? (
              <textarea
                form="respuestas"
                autoComplete="off"
                name={a.id}
                aria-label={a.title}
                defaultValue={answers[a.id] ?? ""}
                placeholder={a.placeholder}
                maxLength={MAX_ANSWER}
                rows={3}
                onChange={(e) => setWritten((w) => ({ ...w, [a.id]: e.currentTarget.value.trim() !== "" }))}
                onBlur={(e) => {
                  if (e.currentTarget.value.trim() !== (answers[a.id] ?? "")) e.currentTarget.form?.requestSubmit();
                }}
                className="w-full max-w-xl resize-none rounded-2xl border border-line bg-ink-2 px-5 py-4 text-center text-lg text-paper placeholder:text-muted/60 focus:border-volt focus:outline-none"
              />
            ) : (
              <div
                role="radiogroup"
                aria-label={a.title}
                className="flex max-w-2xl flex-wrap justify-center gap-2 font-mono text-sm"
              >
                {people.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={votes[a.id] === p.id}
                    onClick={() => vote(a.id, p.id)}
                    className={`rounded-full border px-4 py-2 transition-colors ${
                      votes[a.id] === p.id
                        ? "border-volt bg-volt font-bold text-ink"
                        : "border-line text-paper/80 hover:border-paper hover:text-paper"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="flex items-center justify-center gap-6 font-mono text-xs uppercase tracking-widest text-muted">
        <button
          type="button"
          onClick={() => setCurrent((c) => c - 1)}
          disabled={current === 0}
          aria-label="Premio anterior"
          className="grid size-9 place-items-center rounded-full border border-line hover:text-paper disabled:opacity-30"
        >
          ‹
        </button>
        <span>
          {current + 1} / {ALL.length}
        </span>
        <button
          type="button"
          onClick={() => setCurrent((c) => c + 1)}
          disabled={current === ALL.length - 1}
          aria-label="Siguiente premio"
          className="grid size-9 place-items-center rounded-full border border-line hover:text-paper disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {error && (
        <p role="alert" className="text-center text-sm text-warn">
          {error}
        </p>
      )}
    </div>
  );
}
