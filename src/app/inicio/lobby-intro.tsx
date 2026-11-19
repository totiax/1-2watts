"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { INTRO_DONE_EVENT, LOBBY_INTRO_KEY } from "@/lib/intro";
import { sound } from "@/lib/sound";

gsap.registerPlugin(useGSAP);

function finish() {
  try {
    sessionStorage.setItem(LOBBY_INTRO_KEY, "1");
  } catch {}
  document.documentElement.dataset.intro = "seen";
  window.dispatchEvent(new Event(INTRO_DONE_EVENT));
}

/**
 * La sala se enchufa: saludo, una batería con una celda por persona del
 * equipo que se van prendiendo, un parpadeo y el telón sube. Detrás, la sala
 * se arma por partes (los elementos marcados con data-in). Una vez por sesión.
 */
export function LobbyIntro({ name, done, total }: { name: string; done: number; total: number }) {
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const [gone, setGone] = useState(false);

  useGSAP(
    () => {
      const html = document.documentElement;
      // Si se llegó navegando (sin el script de arranque), decide acá.
      let seen = html.dataset.intro === "seen";
      try {
        seen = Boolean(sessionStorage.getItem(LOBBY_INTRO_KEY));
      } catch {}
      if (seen) {
        html.dataset.intro = "seen";
        setGone(true);
        return;
      }
      // Que la batería del equipo espere a que termine (ver Battery).
      html.dataset.intro = "playing";
      sound().unlock();

      const end = () => {
        finish();
        setGone(true);
        void sound().start();
      };

      const volt = getComputedStyle(html).getPropertyValue("--volt").trim() || "#d4ff3a";
      const counter = { v: 0 };
      const count = root.current!.querySelector<HTMLElement>(".count")!;
      const q = (sel: string) => gsap.utils.toArray<HTMLElement>(document.querySelectorAll(sel));

      gsap.matchMedia().add(
        { motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" },
        (ctx) => {
          const { reduce } = ctx.conditions as { reduce: boolean };
          const t = gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: end });
          tl.current = t;

          if (reduce) {
            t.set(".cell.lit", { backgroundColor: volt })
              .set(count, { textContent: done })
              .to(root.current, { autoAlpha: 0, duration: 0.5, delay: 1.2 });
            return;
          }

          // 1 · Saludo y la batería vacía.
          t.from(".kicker, .hello", { y: 30, autoAlpha: 0, duration: 0.6, stagger: 0.1 })
            .from(".cell", { scaleY: 0, duration: 0.3, stagger: 0.025, ease: "back.out(2)" }, "-=0.2")
            .from(".label", { autoAlpha: 0, duration: 0.3 }, "<");

          // 2 · Se prende una celda por cada uno que enchufó.
          const fill = Math.max(0.6, done * 0.12);
          t.call(() => sound().charge(fill))
            .to(".cell.lit", { backgroundColor: volt, duration: 0.12, stagger: fill / Math.max(done, 1) })
            .to(
              counter,
              {
                v: done,
                duration: fill,
                ease: "none",
                onUpdate: () => (count.textContent = String(Math.round(counter.v))),
              },
              "<",
            );

          // 3 · Parpadeo y sube el telón.
          t.to(".panel", { autoAlpha: 0.25, duration: 0.05, repeat: 3, yoyo: true, ease: "none" }, "+=0.35").to(
            root.current,
            { clipPath: "inset(0 0 100% 0)", duration: 0.8, ease: "power4.inOut" },
            "+=0.1",
          );

          // 4 · Detrás del telón, la sala se arma por partes.
          t.from(q('[data-in="fondo"]'), { autoAlpha: 0, duration: 1.2, ease: "power2.out" }, "<")
            .from(q('[data-in="nav"]'), { y: -20, autoAlpha: 0, duration: 0.5 }, "<0.3")
            .from(q('[data-in="head"]'), { y: 40, autoAlpha: 0, duration: 0.7, stagger: 0.08 }, "<0.05")
            .from(q('[data-in="panel"]'), { y: 60, autoAlpha: 0, duration: 0.7 }, "<0.25")
            .from(
              q("[data-chip]"),
              { scale: 0.6, autoAlpha: 0, duration: 0.4, stagger: 0.04, ease: "back.out(2)" },
              "<0.3",
            );
        },
      );
    },
    { scope: root },
  );

  // Saltar: click en cualquier lado o Escape. Va al final y arranca la música.
  const skip = () => {
    sound().unlock();
    tl.current?.progress(1);
  };

  if (gone) return null;

  return (
    <div
      ref={root}
      id="mw-intro"
      role="dialog"
      aria-label="Entrando a la sala"
      tabIndex={-1}
      onPointerDown={skip}
      onKeyDown={(e) => e.key === "Escape" && skip()}
      className="fixed inset-0 z-50 grid cursor-pointer place-items-center bg-ink px-6 [clip-path:inset(0_0_0_0)]"
    >
      <div className="panel flex flex-col items-center gap-7 text-center">
        <div className="flex flex-col items-center gap-3">
          <p className="kicker font-mono text-xs uppercase tracking-[0.3em] text-volt">Sala de espera</p>
          <p className="hello font-display text-[clamp(3rem,10vw,6.5rem)] font-extrabold leading-none tracking-tight">
            Hola, <span className="text-volt">{name}</span>
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex gap-1.5 rounded-xl border-2 border-paper p-1.5" aria-hidden>
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`cell block h-9 w-3 origin-bottom rounded-sm bg-line sm:h-11 sm:w-4 ${i < done ? "lit" : ""}`}
              />
            ))}
          </div>
          <span aria-hidden className="h-4 w-1.5 rounded-r bg-paper" />
        </div>

        <p className="label font-mono text-sm text-muted">
          <span className="count tabular-nums text-paper">0</span> de {total} enchufados
        </p>
      </div>

      <span className="absolute bottom-6 right-6 font-mono text-xs uppercase tracking-widest text-muted">
        Tocá para saltar
      </span>
    </div>
  );
}
