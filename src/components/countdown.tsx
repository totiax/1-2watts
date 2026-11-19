"use client";

import { useSyncExternalStore } from "react";

const tick = (cb: () => void) => {
  const t = setInterval(cb, 1000);
  return () => clearInterval(t);
};
const nowSeconds = () => Math.floor(Date.now() / 1000);

/** Cuenta regresiva a la fiesta. En el servidor pinta guiones (la hora la pone el navegador). */
export function Countdown({ target }: { target: string }) {
  const now = useSyncExternalStore(tick, nowSeconds, () => null);
  const left = now === null ? null : Math.max(0, Math.floor(Date.parse(target) / 1000) - now);

  const parts: [string, number | null][] = [
    ["días", left === null ? null : Math.floor(left / 86400)],
    ["horas", left === null ? null : Math.floor((left % 86400) / 3600)],
    ["min", left === null ? null : Math.floor((left % 3600) / 60)],
    ["seg", left === null ? null : left % 60],
  ];

  return (
    <div className="flex gap-2" role="timer" aria-live="off">
      {parts.map(([label, value]) => (
        <div key={label} className="flex w-16 flex-col items-center rounded-xl border border-line bg-ink-2 py-2 sm:w-20">
          <span className="font-mono text-2xl font-bold tabular-nums sm:text-3xl">
            {value === null ? "––" : String(value).padStart(2, "0")}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</span>
        </div>
      ))}
    </div>
  );
}
