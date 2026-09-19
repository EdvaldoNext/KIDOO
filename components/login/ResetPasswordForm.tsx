"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      setPending(false);
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      setPending(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("Abra o link do e-mail neste celular e tente de novo.");
      setPending(false);
      return;
    }
    window.location.href = "/app";
  }

  return (
    <form action={onSubmit} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-navy/5 sm:p-8">
      <h1 className="text-2xl font-extrabold">Nova senha</h1>
      <label className="block text-sm font-semibold">
        Nova senha
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3 outline-none ring-royal focus:ring-2"
        />
      </label>
      <label className="block text-sm font-semibold">
        Confirmar senha
        <input
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3 outline-none ring-royal focus:ring-2"
        />
      </label>
      {error ? <p className="text-sm font-semibold text-alert">{error}</p> : null}
      <button type="submit" disabled={pending} className="w-full rounded-xl bg-royal py-3 font-bold text-white disabled:opacity-60">
        {pending ? "Salvando..." : "Salvar senha"}
      </button>
      <p className="text-center text-sm text-navy/70">
        <Link href="/login" className="font-bold text-royal">
          Entrar com as chaves
        </Link>
      </p>
    </form>
  );
}
