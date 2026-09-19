"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function RecoverPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setInfo(null);
    const email = String(formData.get("email") ?? "").trim();
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
    });
    if (resetError) {
      setError("Não foi possível enviar o e-mail. Confira o endereço e tente de novo.");
      setPending(false);
      return;
    }
    setInfo("Se essa conta existir, enviamos um link para criar uma senha nova.");
    setPending(false);
  }

  return (
    <form action={onSubmit} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-navy/5 sm:p-8">
      <h1 className="text-2xl font-extrabold">Esqueci minha senha</h1>
      <p className="text-sm text-navy/70">
        Digite o e-mail do primeiro responsável. Quem entra com as chaves CASA e PAIS não precisa de senha.
      </p>
      <label className="block text-sm font-semibold">
        E-mail
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3 outline-none ring-royal focus:ring-2"
        />
      </label>
      {error ? <p className="text-sm font-semibold text-alert">{error}</p> : null}
      {info ? <p className="text-sm font-semibold text-royal">{info}</p> : null}
      <button type="submit" disabled={pending} className="w-full rounded-xl bg-royal py-3 font-bold text-white disabled:opacity-60">
        {pending ? "Enviando..." : "Enviar link"}
      </button>
      <p className="text-center text-sm text-navy/70">
        <Link href="/login" className="font-bold text-royal">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
