import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Battery } from "@/components/battery";
import { Countdown } from "@/components/countdown";
import { HangingW } from "@/components/hanging-w";
import { InlineScript } from "@/components/inline-script";
import { MusicSelect } from "@/components/music-select";
import { PhotoColumns } from "@/components/photo-columns";
import { requireMember } from "@/lib/auth";
import { db, submittedIds, type PhotoRow } from "@/lib/db";
import { eventDate, formatDay, stageOf, uploadOpensAt } from "@/lib/event";
import { LOBBY_INTRO_BOOT_SCRIPT } from "@/lib/intro";
import { CARD_PROMPTS } from "@/lib/questions";
import { displayName, getRoster } from "@/lib/roster";
import { LobbyIntro } from "./lobby-intro";
import { Team, type Teammate } from "./team";

/**
 * La sala de espera: lo que ve quien ya enchufó, antes de que arranque el
 * juego en la fiesta. Las fotos de todos pasan de fondo, sin nombre.
 */
export default function InicioPage() {
  return (
    <>
      <InlineScript html={LOBBY_INTRO_BOOT_SCRIPT} />
      <Suspense fallback={<main className="flex-1" />}>
        <Content />
      </Suspense>
      <MusicSelect className="fixed bottom-5 right-5 z-40" />
    </>
  );
}

async function Content() {
  const member = await requireMember();
  const stage = stageOf(member.id);
  // Sin fotos, respuestas y votos no se entra: la carga es la puerta.
  if (stage === "carga") redirect("/cargar");
  if (stage === "antes") {
    return (
      <Closed title="Todavía no se enchufó nada">
        El {formatDay(uploadOpensAt())} te llega un mail para cargar tus fotos, contestar unas preguntas y votar los
        premios. Hasta entonces, ahorro de energía.
      </Closed>
    );
  }
  if (stage === "tarde") {
    return (
      <Closed title="Te quedaste sin batería">
        La carga cerró antes de la fiesta y no llegaste a enchufar. Hablá con quien organiza, capaz te tiran un cable.
      </Closed>
    );
  }

  const done = submittedIds();
  const roster = getRoster();
  const level = roster.length ? (done.size / roster.length) * 100 : 0;

  // Las fotos de mascota, fiesta y viaje de quienes enchufaron (el escrache no).
  const photos = (
    db().prepare("SELECT id, member_id, kind FROM photos WHERE kind IN ('mascota', 'fiesta', 'viaje')").all() as Pick<
      PhotoRow,
      "id" | "member_id" | "kind"
    >[]
  ).filter((p) => done.has(p.member_id));
  const answers = new Map(
    (
      db().prepare("SELECT member_id, question_id, answer FROM answers").all() as {
        member_id: string;
        question_id: string;
        answer: string;
      }[]
    ).map((a) => [`${a.member_id}:${a.question_id}`, a.answer]),
  );

  const team: Teammate[] = roster
    .map((m) => ({
      id: m.id,
      name: displayName(m),
      on: done.has(m.id),
      me: m.id === member.id,
      shots: done.has(m.id)
        ? CARD_PROMPTS.flatMap((q) => {
            const photo = photos.find((p) => p.member_id === m.id && p.kind === q.id);
            return photo
              ? [{ photoId: photo.id, emoji: q.emoji, title: q.title, text: answers.get(`${m.id}:${q.id}`) ?? "" }]
              : [];
          })
        : [],
    }))
    .sort((a, b) => Number(b.on) - Number(a.on) || a.name.localeCompare(b.name, "es"));

  const party = eventDate();

  return (
    <>
      <LobbyIntro name={displayName(member)} done={done.size} total={roster.length} />
      <PhotoColumns photoIds={photos.map((p) => p.id).sort()} />

      {/* El contenido deja pasar el mouse a las fotos salvo en los paneles. */}
      <main className="pointer-events-none relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-between gap-8 px-5 py-6 sm:px-8">
        <nav data-in="nav" className="pointer-events-auto flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-extrabold">
            <span className="text-volt">½</span> watts
          </Link>
          <form action="/api/auth/logout" method="post">
            <button className="font-mono text-xs uppercase tracking-widest text-muted hover:text-paper">Salir</button>
          </form>
        </nav>

        <header className="flex flex-col items-center gap-5 text-center">
          <p data-in="head" className="font-mono text-xs uppercase tracking-[0.3em] text-volt">
            Sala de espera · fiesta del {formatDay(party)}
          </p>
          <h1 data-in="head" className="pointer-events-auto font-display text-[clamp(4rem,min(14vw,17vh),8.5rem)] font-extrabold leading-[0.85] tracking-tight">
            <span className="text-volt">½</span> <HangingW />atts
          </h1>
          <p data-in="head" className="max-w-md text-paper/80">
            Hola, <strong className="text-paper">{displayName(member)}</strong>. Ya enchufaste. En la fiesta va el
            video, el juego en el proyector (tené el celu a mano) y al final, los premios.
          </p>
          <div data-in="head" className="pointer-events-auto">
            <Countdown target={party.toISOString()} />
          </div>
        </header>

        <section data-in="panel" className="pointer-events-auto mb-14 grid gap-5 rounded-3xl border border-line bg-ink/80 p-5 backdrop-blur-md sm:p-6 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-10">
          <div className="flex flex-col items-center gap-3 lg:items-start">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted">Batería del equipo</span>
            <Battery level={level} />
            <p className="font-mono text-sm">
              <strong className="text-volt">{done.size}</strong> de {roster.length} enchufados
            </p>
          </div>
          <div className="pointer-events-auto">
            <Team team={team} />
          </div>
        </section>

      </main>
    </>
  );
}

function Closed({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-5 px-5 text-center">
      <Battery level={0} />
      <h1 className="font-display text-4xl font-extrabold">{title}</h1>
      <p className="text-paper/75">{children}</p>
      <form action="/api/auth/logout" method="post">
        <button className="font-mono text-xs uppercase tracking-widest text-muted hover:text-paper">Salir</button>
      </form>
    </main>
  );
}
