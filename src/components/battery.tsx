"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { INTRO_DONE_EVENT } from "@/lib/intro";

gsap.registerPlugin(useGSAP);

/**
 * La batería de ½ watts. `level` va de 0 a 100. Se carga con un pequeño
 * titileo al final, como un foco que duda; sin movimiento si el usuario lo pide.
 */
export function Battery({ level, size = "lg" }: { level: number; size?: "lg" | "sm" }) {
  const root = useRef<HTMLDivElement>(null);
  const pct = Math.max(0, Math.min(100, Math.round(level)));

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Si la intro está corriendo, espera a que termine para cargarse.
        const waiting =
          document.documentElement.dataset.intro === "playing" && document.getElementById("mw-intro");
        const tl = gsap.timeline({ defaults: { ease: "power3.out" }, paused: Boolean(waiting) });
        const start = () => tl.play();
        if (waiting) window.addEventListener(INTRO_DONE_EVENT, start, { once: true });
        tl.fromTo(".fill", { scaleX: 0 }, { scaleX: pct / 100, duration: 1.4 })
          .fromTo(".label", { textContent: 0 }, { textContent: pct, duration: 1.4, snap: { textContent: 1 } }, 0)
          .to(".fill", { opacity: 0.55, duration: 0.06, repeat: 3, yoyo: true, ease: "none" }, "-=0.1");
        return () => window.removeEventListener(INTRO_DONE_EVENT, start);
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".fill", { scaleX: pct / 100 });
      });
    },
    { scope: root, dependencies: [pct], revertOnUpdate: true },
  );

  const big = size === "lg";
  return (
    <div
      ref={root}
      role="img"
      aria-label={`Batería al ${pct}%`}
      className={`flex items-center ${big ? "gap-1.5" : "gap-1"}`}
    >
      <div
        className={`relative overflow-hidden border-paper ${
          big ? "h-20 w-52 rounded-2xl border-[3px] p-1.5 sm:h-24 sm:w-64" : "h-6 w-14 rounded-md border-2 p-0.5"
        }`}
      >
        <div
          className={`fill h-full origin-left bg-volt ${big ? "rounded-xl" : "rounded-sm"}`}
          style={{ transform: `scaleX(${pct / 100})` }}
        />
        {big && (
          <span className="absolute inset-0 grid place-items-center font-mono text-2xl font-bold text-paper mix-blend-difference">
            <span>
              <span className="label">{pct}</span>%
            </span>
          </span>
        )}
      </div>
      <div className={`rounded-r bg-paper ${big ? "h-8 w-2.5 sm:h-10" : "h-2.5 w-1"}`} />
    </div>
  );
}
