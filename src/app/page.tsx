import Link from "next/link";
import { Suspense } from "react";
import { InlineScript } from "@/components/inline-script";
import { HangingW } from "@/components/hanging-w";
import { Intro } from "@/components/intro";
import { MusicSelect } from "@/components/music-select";
import { getCurrentMember } from "@/lib/auth";
import { INTRO_BOOT_SCRIPT } from "@/lib/intro";
import { isConfigured } from "@/lib/oauth";
import { displayName } from "@/lib/roster";
import { LoginForm } from "./login-form";

const ERRORS: Record<string, string> = {
  "fuera-del-equipo": "Ese mail no está en la lista de Tecnología. Probá con tu mail de 25watts.",
  "sin-mail": "El proveedor no nos pasó tu mail. Probá con la otra opción.",
  "sin-config": "Ese login todavía no está configurado.",
  estado: "El login se cortó a mitad de camino. Probá de nuevo.",
  proveedor: "Hubo un problema hablando con Google. Probá de nuevo.",
  sesion: "Iniciá sesión para seguir.",
};

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-12 px-5 py-16 text-center sm:px-8">
      <InlineScript html={INTRO_BOOT_SCRIPT} />
      <Intro />

      <header className="flex flex-col items-center gap-8">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">25watts · fin de año 2026</p>
        <h1 className="font-display text-[clamp(4.5rem,16vw,10rem)] font-extrabold leading-[0.85] tracking-tight">
          <span className="text-volt">½</span> <HangingW />atts
        </h1>
      </header>

      <Suspense fallback={<div className="h-56 w-full max-w-md" />}>
        <Access searchParams={searchParams} />
      </Suspense>

      <MusicSelect className="fixed bottom-5 right-5 z-40" />
    </main>
  );
}

async function Access({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const [member, params] = await Promise.all([getCurrentMember(), searchParams]);
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;

  if (member) {
    return (
      <section className="flex flex-col items-center gap-4">
        <p className="text-xl">
          Hola, <strong className="text-volt">{displayName(member)}</strong>.
        </p>
        <Link
          href="/inicio"
          className="inline-flex h-12 items-center justify-center rounded-full bg-volt px-7 font-bold text-ink transition-transform hover:-translate-y-0.5"
        >
          Entrar →
        </Link>
      </section>
    );
  }

  return (
    <section className="flex w-full max-w-md flex-col items-center gap-5 rounded-3xl border border-line bg-ink-2 p-6 sm:p-8">
      {error && (
        <p role="alert" className="w-full rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-warn">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-bold">Entrá con tu mail de 25watts</h2>
      </div>
      <LoginForm />
      <div className="flex w-full items-center gap-3 font-mono text-xs uppercase tracking-widest text-muted">
        <span className="h-px flex-1 bg-line" />o<span className="h-px flex-1 bg-line" />
      </div>
      <LoginButton href="/api/auth/google" label="Entrar con Google" ready={isConfigured("google")} />
    </section>
  );
}

function LoginButton({ href, label, ready }: { href: string; label: string; ready: boolean }) {
  if (!ready) {
    return (
      <span
        aria-disabled
        title="Falta configurar las credenciales en .env"
        className="inline-flex h-12 w-full cursor-not-allowed items-center justify-center rounded-full border border-line px-7 text-muted"
      >
        {label}
      </span>
    );
  }
  return (
    <a
      href={href}
      className="inline-flex h-12 w-full items-center justify-center rounded-full bg-paper px-7 font-bold text-ink transition-transform hover:-translate-y-0.5"
    >
      {label}
    </a>
  );
}
