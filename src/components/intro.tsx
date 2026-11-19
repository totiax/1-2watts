"use client";

import localFont from "next/font/local";
import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Logo25w } from "./logo-25w";
import { INTRO_DONE_EVENT, INTRO_KEY } from "@/lib/intro";
import { sound } from "@/lib/sound";

gsap.registerPlugin(useGSAP);

const arkibal = localFont({ src: "../fonts/Arkibal-Serif-Bold.ttf", weight: "700", display: "block" });

function finish() {
  try {
    sessionStorage.setItem(INTRO_KEY, "1");
  } catch {}
  document.documentElement.dataset.intro = "seen";
  window.dispatchEvent(new Event(INTRO_DONE_EVENT));
}

/**
 * Arranca vestida de 25watts (azul, rosa, Arkibal), carga hasta un 99% que
 * no termina nunca, se corta la luz y vuelve como ½ watts.
 */
export function Intro() {
  const root = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const [gone, setGone] = useState(false);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      const html = document.documentElement;
      // Navegación interna (sin el script de arranque) o ya vista: no se muestra.
      let seen = html.dataset.intro === "seen";
      if (!html.dataset.intro) {
        try {
          seen = Boolean(sessionStorage.getItem(INTRO_KEY));
        } catch {}
      }
      if (seen) {
        html.dataset.intro = "seen";
        setGone(true);
        return;
      }
      html.dataset.intro = "playing";

      const counter = { v: 0 };
      const pct = root.current!.querySelector<HTMLElement>(".pct")!;
      const setPct = () => (pct.textContent = `${Math.round(counter.v)}%`);
      const mm = gsap.matchMedia();

      mm.add(
        { motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" },
        (ctx) => {
          const { reduce } = ctx.conditions as { reduce: boolean };
          const tl = gsap.timeline({
            defaults: { ease: "power3.out" },
            onComplete: () => {
              finish();
              setGone(true);
            },
          });
          tlRef.current = tl;
          // Solo en dev: permite inspeccionar la intro desde la consola (window.__mwIntro.seek(3)).
          if (process.env.NODE_ENV === "development") {
            (window as unknown as { __mwIntro?: gsap.core.Timeline }).__mwIntro = tl;
          }

          if (reduce) {
            // Versión quieta: los dos estados con un fundido, sin titileos.
            tl.set(".phase-b", { autoAlpha: 0 })
              .set(".half, .word, .tag", { autoAlpha: 1 })
              .to(".phase-a", { autoAlpha: 0, duration: 0.4, delay: 0.8 })
              .to(".stage", { backgroundColor: "#0d0d0c", duration: 0.4 }, "<")
              .to(".phase-b", { autoAlpha: 1, duration: 0.4 })
              .to(root.current, { autoAlpha: 0, duration: 0.5, delay: 0.8 });
            return;
          }

          // 1 · Entra el logo de 25watts, letra por letra.
          tl.from(".glyph", { yPercent: 110, opacity: 0, duration: 0.7, stagger: 0.05 })

            // 1b · Espera el primer toque (en cualquier lado): es lo que habilita el sonido.
            .fromTo(".hint", { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.4 }, "-=0.2")
            .call(() => root.current?.querySelector<HTMLButtonElement>(".hint")?.focus())
            // Si ya tocaron antes de que aparezca el botón, no frena.
            .call(() => {
              if (!started.current) tlRef.current?.pause();
            })
            .to(".hint", { autoAlpha: 0, duration: 0.2 })
            .from(".meta", { opacity: 0, y: 8, duration: 0.5 })

            // 2 · La carga: rápido, se traba, sigue, y se clava en 99.
            .call(() => sound().charge(3))
            .to(counter, { v: 37, duration: 0.6, onUpdate: setPct }, "+=0.1")
            .to(".bar", { scaleX: 0.37, duration: 0.6 }, "<")
            .to(counter, { v: 68, duration: 0.5, onUpdate: setPct, ease: "power1.inOut" }, "+=0.2")
            .to(".bar", { scaleX: 0.68, duration: 0.5, ease: "power1.inOut" }, "<")
            .to(counter, { v: 99, duration: 0.45, onUpdate: setPct, ease: "expo.out" }, "+=0.2")
            .to(".bar", { scaleX: 0.99, duration: 0.45, ease: "expo.out" }, "<")
            .set(".msg-a", { display: "none" }, "+=0.15")
            .set(".msg-b", { display: "inline" }, "<")
            .to(".bar", { scaleX: 0.995, duration: 0.7, ease: "none" })
            .to(counter, { v: 100, duration: 0.05, onUpdate: setPct })
            .to(".bar", { scaleX: 1, duration: 0.05 }, "<")

            // 3 · Se corta la luz: titileo irregular y apagón.
            .set(".msg-b", { display: "none" })
            .set(".msg-c", { display: "inline" });

          const flicker = [0.05, 0.08, 0.04, 0.12, 0.03, 0.06, 0.18];
          tl.call(() => sound().powerCut(flicker));
          flicker.forEach((d, i) => {
            const off = i % 2 === 0;
            tl.set(".stage", { backgroundColor: off ? "#000" : "#0845ff" }, `+=${d}`).set(
              ".phase-a",
              { opacity: off ? 0.15 : 1 },
              "<",
            );
          });

          tl.set(".stage", { backgroundColor: "#000" })
            .set(".phase-a", { autoAlpha: 0 })

            // 4 · Vuelve la luz… a media potencia.
            .fromTo(
              ".half",
              { autoAlpha: 0, scale: 0.4, rotate: -12 },
              { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.7, ease: "back.out(2.2)" },
              "+=0.3",
            )
            .call(() => sound().start(), undefined, "<")
            .to(".stage", { backgroundColor: "#0d0d0c", duration: 0.3 }, "<")
            .fromTo(".word", { autoAlpha: 0, x: -24 }, { autoAlpha: 1, x: 0, duration: 0.5 }, "-=0.35")
            .fromTo(".tag", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.4 }, "-=0.2")
            .to(".half", { textShadow: "0 0 32px rgba(215,255,58,.55)", duration: 0.25, yoyo: true, repeat: 1 }, "-=0.2")

            // 5 · La w está floja: tiembla y queda colgando de un solo tornillo.
            .to(".w", { x: 1.5, rotation: 2, duration: 0.05, repeat: 5, yoyo: true, ease: "none" }, "+=0.15")
            .set(".w", { x: 0, rotation: 0, transformOrigin: "92% 10%" })
            // Cede un poco y después se suelta el tornillo de la izquierda: queda colgando del lado de la "a".
            .to(".w", { rotation: -8, duration: 0.25, ease: "power2.out" })
            .to(".w", { rotation: -35, duration: 1.3, ease: "elastic.out(1, 0.3)" }, "+=0.25")
            .call(() => sound().snap(), undefined, "<")
            // Le abre lugar a la punta para que no pise la "a".
            .to(".w", { marginRight: "0.3em", duration: 0.4, ease: "power2.out" }, "<")
            .set(".tag-a", { display: "none" }, "-=0.5")
            .set(".tag-b", { display: "inline" }, "<")

            // 6 · Sale la cortina y aparece la página.
            .to(root.current, { clipPath: "inset(0 0 100% 0)", duration: 0.8, ease: "power4.inOut" }, "+=0.45");
        },
      );
    },
    { scope: root },
  );

  // Primer toque en cualquier lado: habilita el audio y sigue la intro.
  const turnOn = () => {
    if (started.current) return;
    started.current = true;
    sound().unlock();
    if (tlRef.current?.paused()) tlRef.current.play();
  };

  // Saltar: va al final sin disparar los sonidos intermedios y arranca la música elegida.
  const skip = () => {
    sound().unlock();
    tlRef.current?.progress(1, true);
    finish();
    setGone(true);
    sound().start();
  };

  if (gone) return null;

  return (
    <div
      ref={root}
      id="mw-intro"
      role="dialog"
      aria-label="Intro de ½ watts"
      onKeyDown={(e) => (e.key === "Escape" ? skip() : turnOn())}
      onPointerDown={(e) => {
        if (!(e.target as HTMLElement).closest(".skip")) turnOn();
      }}
      className="fixed inset-0 z-50 [clip-path:inset(0_0_0_0)]"
    >
      <div className="stage absolute inset-0 grid place-items-center bg-[#0845ff] px-6">
        {/* Estado A: 25watts cargando */}
        <div className="phase-a flex w-full max-w-md flex-col items-center gap-8 text-[#ffc7d6]">
          <div className="overflow-hidden">
            <Logo25w className="h-10 w-auto sm:h-14" />
          </div>
          <div className="grid w-full">
            <div className="meta flex w-full flex-col gap-3 [grid-area:1/1]">
              <div className="h-1 w-full overflow-hidden rounded-full bg-[#ffc7d6]/25">
                <div className="bar h-full w-full origin-left scale-x-0 rounded-full bg-[#ffc7d6]" />
              </div>
              <div className={`${arkibal.className} flex justify-between text-sm`}>
                <span>
                  <span className="msg-a">Cargando energía de fin de año</span>
                  <span className="msg-b hidden">Casi… como todo en diciembre</span>
                  <span className="msg-c hidden">Uh.</span>
                </span>
                <span className="pct tabular-nums">0%</span>
              </div>
            </div>
            {/* Sin anillo de foco ni brillo: al pasar, la pastilla se aclara y el ícono se agranda. */}
            <button
              type="button"
              className={`hint group invisible flex cursor-pointer items-center gap-3 justify-self-center self-center rounded-full bg-[#ffc7d6] py-2 pl-2 pr-5 text-sm text-[#0845ff] outline-none transition-[background-color,transform] duration-300 ease-out [-webkit-tap-highlight-color:transparent] [grid-area:1/1] hover:bg-white focus-visible:bg-white active:scale-95 ${arkibal.className}`}
            >
              <span aria-hidden className="relative grid size-8 place-items-center">
                <span className="absolute inset-0 rounded-full bg-[#0845ff]/35 motion-safe:animate-ping" />
                <span className="relative grid size-8 place-items-center rounded-full bg-[#0845ff] text-[#ffc7d6] transition-transform duration-300 ease-out group-hover:scale-110">
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                    <path d="M12 3v8" />
                    <path d="M6.3 7.2a8 8 0 1 0 11.4 0" />
                  </svg>
                </span>
              </span>
              <span className="tracking-wide">Tocá para encender</span>
            </button>
          </div>
        </div>

        {/* Estado B: ½ watts */}
        <div className="phase-b pointer-events-none absolute flex flex-col items-center gap-8">
          <p className="font-display text-[clamp(4rem,18vw,10rem)] font-extrabold leading-none tracking-tight">
            <span className="half invisible inline-block text-volt">½</span>{" "}
            <span className="word invisible inline-block text-paper">
              <span className="w inline-block will-change-transform">w</span>atts
            </span>
          </p>
          <p className="tag invisible font-mono text-xs uppercase tracking-[0.3em] text-muted">
            <span className="tag-a">ahorro de energía activado</span>
            <span className="tag-b hidden">se nos aflojó la w</span>
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={skip}
        className="skip absolute bottom-6 right-6 cursor-pointer px-2 py-2 font-mono text-xs uppercase tracking-widest text-[#ffc7d6]/80 hover:text-white"
      >
        Saltar
      </button>
    </div>
  );
}
