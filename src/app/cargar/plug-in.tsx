"use client";

import { useActionState, useRef } from "react";
import { plugIn, type PlugState } from "./actions";

type Item = { label: string; done: boolean };

/**
 * El botón de enchufar: abre una confirmación con la lista de lo cargado.
 * Confirmar es aceptar todo, porque después no se puede volver a la carga.
 */
export function PlugIn({ items, closes }: { items: Item[]; closes: string }) {
  const [state, action, pending] = useActionState<PlugState, FormData>(plugIn, null);
  const dialog = useRef<HTMLDialogElement>(null);
  const ready = items.every((i) => i.done);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="inline-flex h-11 items-center rounded-full bg-volt px-6 font-bold text-ink transition-transform hover:-translate-y-0.5"
      >
        Enchufar ⚡
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        aria-labelledby="enchufar-titulo"
        className="m-auto w-[min(28rem,calc(100vw-2rem))] max-w-none rounded-3xl border border-line bg-ink-2 p-0 text-paper backdrop:bg-ink/85 backdrop:backdrop-blur-sm"
      >
        <form action={action} className="flex flex-col gap-6 p-6 sm:p-7">
          <div className="flex flex-col gap-2">
            <h2 id="enchufar-titulo" className="font-display text-3xl font-bold">
              {ready ? "¿Enchufamos?" : "Te falta poco"}
            </h2>
            <p className="text-sm text-muted">
              {ready
                ? "Al confirmar aceptás todo lo que cargaste: ya no vas a poder cambiar fotos, respuestas ni votos."
                : `Completá lo que falta para enchufar. La carga cierra el ${closes}.`}
            </p>
          </div>

          <ul className="flex flex-col gap-3">
            {items.map((i) => (
              <li key={i.label} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={`grid size-6 shrink-0 place-items-center rounded-full border-2 text-xs font-bold ${
                    i.done ? "border-volt bg-volt text-ink" : "border-line text-transparent"
                  }`}
                >
                  ✓
                </span>
                <span className={i.done ? "text-paper" : "text-muted"}>
                  {i.label}
                  <span className="sr-only">{i.done ? " (listo)" : " (falta)"}</span>
                </span>
              </li>
            ))}
          </ul>

          {state && (
            <p role="alert" className="text-sm text-warn">
              {state.message}
            </p>
          )}

          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="font-mono text-xs uppercase tracking-widest text-muted hover:text-paper"
            >
              {ready ? "Revisar" : "Volver"}
            </button>
            {ready && (
              <button
                disabled={pending}
                className="inline-flex h-11 items-center rounded-full bg-volt px-6 font-bold text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              >
                {pending ? "Enchufando…" : "Confirmar y enchufar"}
              </button>
            )}
          </div>
        </form>
      </dialog>
    </>
  );
}
