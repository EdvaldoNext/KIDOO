"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { isParentRole, type UserRole } from "@/lib/auth";
import { CLIENT_DEV_BYPASS_AUTH } from "@/lib/config";
import { EnterTestAppButton } from "@/components/dev/EnterTestAppButton";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onParentSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const { data, error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signError) {
      setError("E-mail ou senha inválidos.");
      setPending(false);
      return;
    }

    const role = data.user.app_metadata?.role as UserRole | undefined;
    const admin = data.user.app_metadata?.platform_admin === true;
    if (admin) {
      await supabase.auth.signOut();
      setError("Conta administrativa entra em /admin/login — este login é só da família.");
      setPending(false);
      return;
    }
    if (role === "child") {
      await supabase.auth.signOut();
      setError("Esta conta é de filho. Use o link e a chave que seus pais enviaram.");
      setPending(false);
      return;
    }
    window.location.href = isParentRole(role) ? "/app" : "/onboarding";
  }

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm ring-1 ring-navy/5 sm:p-8">
      {CLIENT_DEV_BYPASS_AUTH ? (
        <div className="space-y-3">
          <p className="rounded-xl bg-gold/30 px-3 py-2 text-sm font-semibold text-navy">
            Modo teste: sem login. Entre direto no painel.
          </p>
          <EnterTestAppButton
            label="Entrar no painel dos pais agora"
            redirectTo="/app"
            buttonClassName="w-full rounded-xl bg-royal py-3 font-bold text-white disabled:opacity-60"
          />
          <EnterTestAppButton
            label="Abrir tarefas de teste"
            redirectTo="/app/kids"
            buttonClassName="w-full rounded-xl bg-success py-3 font-bold text-navy disabled:opacity-60"
          />
        </div>
      ) : (
        <form action={onParentSubmit} className="space-y-4">
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
          <label className="block text-sm font-semibold">
            Senha
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3 outline-none ring-royal focus:ring-2"
            />
          </label>
          {error ? <p className="text-sm font-semibold text-alert">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-royal py-3 font-bold text-white disabled:opacity-60"
          >
            {pending ? "Entrando..." : "Entrar no painel dos pais"}
          </button>
          <p className="text-center text-sm text-navy/70">
            Ainda não tem família?{" "}
            <Link href="/cadastro" className="font-bold text-royal">
              Criar conta
            </Link>
          </p>
          <p className="text-center text-sm text-navy/70">
            É filho(a)?{" "}
            <Link href="/entrar" className="font-bold text-royal">
              Entrar com a chave
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
