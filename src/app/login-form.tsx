"use client";

import { useActionState } from "react";
import { loginWithPassword, type LoginState } from "./actions";

const field =
  "h-12 w-full rounded-full border border-line bg-ink px-5 text-paper placeholder:text-muted/70 focus:border-volt focus:outline-none";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginWithPassword, null);

  return (
    <form action={action} className="flex w-full flex-col gap-3 text-left">
      <label className="sr-only" htmlFor="email">
        Mail
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="username"
        placeholder="nombre.apellido@25watts.com.ar"
        defaultValue={state?.email}
        className={field}
      />
      <label className="sr-only" htmlFor="password">
        Contraseña
      </label>
      <input
        id="password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        placeholder="Contraseña"
        className={field}
      />
      {state?.error && (
        <p role="alert" className="px-2 text-sm text-warn">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="h-12 rounded-full bg-volt font-bold text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {pending ? "Enchufando…" : "Entrar"}
      </button>
    </form>
  );
}
