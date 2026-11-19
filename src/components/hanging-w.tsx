"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { sound } from "@/lib/sound";

gsap.registerPlugin(useGSAP);

const REST = -35; // colgada del tornillo del lado de la "a"

/**
 * La w floja del título. Al pasarle el mouse se balancea hacia donde la
 * empujaste (más fuerte cuanto más rápido), y con un click da una vuelta
 * entera colgada del tornillo. Sin movimiento si el usuario lo pide.
 */
export function HangingW() {
  const el = useRef<HTMLSpanElement>(null);
  const reduce = useRef(false);

  useGSAP(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const node = el.current;
    gsap.set(node, { rotation: REST, transformOrigin: "92% 10%" });
    // Los empujones se crean en eventos (fuera del contexto): se matan al desmontar.
    return () => gsap.killTweensOf(node);
  });

  // Empujón: inclina hacia el lado del movimiento y vuelve con rebote de resorte.
  function push(dx: number) {
    if (reduce.current) return;
    const force = gsap.utils.clamp(-40, 40, dx === 0 ? 18 : dx * 2.2);
    gsap.killTweensOf(el.current, "rotation");
    gsap
      .timeline()
      .to(el.current, { rotation: REST + force, duration: 0.18, ease: "power2.out" })
      .to(el.current, { rotation: REST, duration: 1.8, ease: "elastic.out(1.15, 0.22)" });
    if (Math.abs(force) > 12) sound().boing(Math.abs(force) / 40);
  }

  // Click: vuelta entera alrededor del tornillo y queda otra vez colgando.
  function spin() {
    if (reduce.current) return;
    gsap.killTweensOf(el.current, "rotation");
    sound().snap();
    gsap
      .timeline()
      .to(el.current, { rotation: REST + 360, duration: 0.9, ease: "power2.in" })
      .set(el.current, { rotation: REST })
      .to(el.current, { rotation: REST + 18, duration: 0.15, ease: "power1.out" })
      .to(el.current, { rotation: REST, duration: 1.6, ease: "elastic.out(1.2, 0.2)" });
  }

  const last = useRef(0);
  return (
    <span
      ref={el}
      className="w-hang cursor-grab select-none"
      onPointerEnter={(e) => push(e.movementX)}
      onPointerMove={(e) => {
        // Si la sacudís rápido, la vuelve a empujar (como mucho cada 300 ms).
        const now = performance.now();
        if (Math.abs(e.movementX) > 10 && now - last.current > 300) {
          last.current = now;
          push(e.movementX);
        }
      }}
      onClick={spin}
    >
      w
    </span>
  );
}
