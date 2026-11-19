import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Battery } from "@/components/battery";
import { requireMember } from "@/lib/auth";
import { AWARDS, YEAR_AWARDS } from "@/lib/awards";
import { answersOf, photosOf, votesOf } from "@/lib/db";
import { eventDate, formatDay, progressOf, stageOf } from "@/lib/event";
import { PROMPTS } from "@/lib/questions";
import { displayName, getRoster } from "@/lib/roster";
import { AwardVotes } from "./award-votes";
import { PhotoUploader } from "./photo-uploader";
import { PlugIn } from "./plug-in";
import { PromptCards } from "./prompt-cards";
import { Wizard, type Step } from "./wizard";

export default function CargarPage() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-6xl flex-col gap-4 overflow-hidden px-5 py-4 sm:px-8 sm:py-5">
      <Suspense fallback={<p className="font-mono text-muted">Cargando energía…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  const member = await requireMember();
  // Esta pantalla se ve una sola vez: solo mientras la carga está abierta y no enchufaste.
  if (stageOf(member.id) !== "carga") redirect("/inicio");
  const progress = progressOf(member.id);
  const closes = formatDay(eventDate());
  const byKind = Object.fromEntries(photosOf(member.id).map((p) => [p.kind, p.id]));
  const answers = answersOf(member.id);
  const totalAwards = AWARDS.length + YEAR_AWARDS.length;

  const people = getRoster()
    .filter((m) => m.id !== member.id)
    .map((m) => ({ id: m.id, name: displayName(m) }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  // Fotos con respuesta = 50%, selfie = 10%, premios votados = 40%.
  const level =
    (progress.prompts / PROMPTS.length) * 50 + (progress.selfie ? 10 : 0) + (progress.votes / totalAwards) * 40;

  const items = [
    { label: `${progress.prompts} de ${PROMPTS.length} fotos con su respuesta`, done: progress.prompts === PROMPTS.length },
    { label: "Tu selfie", done: progress.selfie },
    { label: `${progress.votes} de ${totalAwards} premios`, done: progress.votes === totalAwards },
  ];

  const steps: Step[] = [
    {
      id: "fotos",
      label: "Fotos",
      title: "Cuatro fotos, cuatro preguntas",
      hint: "Tocá cada una para subir la foto y contestar su pregunta.",
      done: items[0].done,
      panel: <PromptCards photos={byKind} answers={answers} people={people} />,
    },
    {
      id: "selfie",
      label: "Selfie",
      title: "Tu selfie para la foto grupal",
      hint: "Una sola, de frente y con buena luz. La vamos a pasar a dibujito. Esta no la ve nadie.",
      done: items[1].done,
      panel: (
        <div className="mx-auto flex h-full w-full max-w-sm flex-col">
          <PhotoUploader kind="selfie" photoId={byKind.selfie ?? null} label="Subir selfie" selfie fill />
        </div>
      ),
    },
    {
      id: "premios",
      label: "Premios",
      title: "Premios ½ watts",
      hint: "Nadie ve lo que votás: se revelan al final de la fiesta.",
      done: items[2].done,
      panel: <AwardVotes people={people} initial={votesOf(member.id)} answers={answers} />,
    },
  ];

  return (
    <>
      <nav className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-4">
          <Link href="/" className="font-display text-2xl font-extrabold">
            <span className="text-volt">½</span> watts
          </Link>
          <p className="hidden font-mono text-[11px] uppercase tracking-[0.25em] text-volt md:block">
            Hola, {displayName(member)} · cargá tu batería
          </p>
        </div>
        <div className="flex items-center gap-5">
          <Battery level={level} size="sm" />
          <form action="/api/auth/logout" method="post">
            <button className="font-mono text-xs uppercase tracking-widest text-muted hover:text-paper">Salir</button>
          </form>
        </div>
      </nav>
      <Wizard steps={steps} finish={<PlugIn closes={closes} items={items} />} />
    </>
  );
}
