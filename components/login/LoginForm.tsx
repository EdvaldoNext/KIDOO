"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { isParentRole, type UserRole } from "@/lib/auth";
import { CLIENT_DEV_BYPASS_AUTH } from "@/lib/config";
import { EnterTestAppButton } from "@/components/dev/EnterTestAppButton";
import { HelpTip } from "@/components/HelpTip";

type Mode = "parent" | "child";

export function LoginForm({ defaultMode = "parent" }: { defaultMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(defaultMode);
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
      setError("Esta conta é de filho. Use a aba Sou filho(a).");
      setPending(false);
      return;
    }
    window.location.href = isParentRole(role) ? "/app" : "/onboarding";
  }

  async function onChildSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const code = String(formData.get("code") ?? "")
      .trim()
      .toUpperCase();
    const pin = String(formData.get("pin") ?? "");
    const response = await fetch("/api/auth/child-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, pin }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Código ou PIN inválidos.");
      setPending(false);
      return;
    }
    window.location.href = "/app/kids";
  }

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm ring-1 ring-navy/5 sm:p-8">
      <div className="grid grid-cols-2 rounded-2xl bg-canvas p-1">
        <button
          type="button"
          onClick={() => {
            setMode("parent");
            setError(null);
          }}
          className={`rounded-xl px-3 py-2.5 text-sm font-bold ${
            mode === "parent" ? "bg-royal text-white shadow-sm" : "text-navy/70"
          }`}
        >
          Sou pai/mãe
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("child");
            setError(null);
          }}
          className={`rounded-xl px-3 py-2.5 text-sm font-bold ${
            mode === "child" ? "bg-royal text-white shadow-sm" : "text-navy/70"
          }`}
        >
          Sou filho(a)
        </button>
      </div>

      {CLIENT_DEV_BYPASS_AUTH ? (
        <div className="mt-6 space-y-3">
          <p className="rounded-xl bg-gold/30 px-3 py-2 text-sm font-semibold text-navy">
            Modo teste: sem login. Entre direto no painel.
          </p>
          <EnterTestAppButton
            label={mode === "child" ? "Entrar no KIDOO Kids agora" : "Entrar no painel dos pais agora"}
            redirectTo={mode === "child" ? "/app/kids" : "/app"}
            buttonClassName={
              mode === "child"
                ? "w-full rounded-xl bg-success py-3 font-bold text-navy disabled:opacity-60"
                : "w-full rounded-xl bg-royal py-3 font-bold text-white disabled:opacity-60"
            }
          />
        </div>
      ) : mode === "parent" ? (
        <form action={onParentSubmit} className="mt-6 space-y-4">
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
        </form>
      ) : (
        <form action={onChildSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold">
            <span className="inline-flex items-center">
              Código da família
              <HelpTip label="Ajuda sobre o código">
                Peça aos pais. Está na tela Filhos, tipo KIDOO-7X4K.
              </HelpTip>
            </span>
            <input
              name="code"
              required
              placeholder="KIDOO-7X4K"
              autoCapitalize="characters"
              className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3 uppercase outline-none ring-royal focus:ring-2"
            />
          </label>
          <label className="block text-sm font-semibold">
            <span className="inline-flex items-center">
              PIN de 4 dígitos
              <HelpTip label="Ajuda sobre o PIN">
                Senha de 4 números que seus pais escolheram quando te cadastraram.
              </HelpTip>
            </span>
            <input
              name="pin"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              required
              autoComplete="one-time-code"
              className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3 tracking-[0.4em] outline-none ring-royal focus:ring-2"
            />
          </label>
          {error ? <p className="text-sm font-semibold text-alert">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-success py-3 font-bold text-navy disabled:opacity-60"
          >
            {pending ? "Entrando..." : "Entrar no KIDOO Kids"}
          </button>
        </form>
      )}
    </div>
  );
}
