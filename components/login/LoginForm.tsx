"use client";

import Link from "next/link";
import { useState } from "react";
import { CLIENT_DEV_BYPASS_AUTH } from "@/lib/config";
import { EnterTestAppButton } from "@/components/dev/EnterTestAppButton";
import { HelpTip } from "@/components/HelpTip";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [emailLogin, setEmailLogin] = useState(false);

  async function onKeySubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/parent-door", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kids_access_key: String(formData.get("kids_access_key") ?? ""),
          parent_access_key: String(formData.get("parent_access_key") ?? ""),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Não foi possível entrar.");
        setPending(false);
        return;
      }
      window.location.href = "/app";
    } catch {
      setError("Falha de rede ao entrar.");
      setPending(false);
    }
  }

  async function onParentSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    try {
      const response = await fetch("/api/auth/parent-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { error?: string; path?: string };
      if (!response.ok) {
        setError(payload.error ?? "E-mail ou senha inválidos.");
        setPending(false);
        return;
      }
      window.location.href = payload.path ?? "/app";
    } catch {
      setError("Falha de rede ao entrar.");
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm ring-1 ring-navy/5 sm:p-8">
      {CLIENT_DEV_BYPASS_AUTH ? (
        <div className="mb-4 space-y-3">
          <p className="rounded-xl bg-gold/30 px-3 py-2 text-sm font-semibold text-navy">
            Modo teste: entre com as chaves da casa ou vá direto ao painel.
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
          <p className="text-center text-xs font-semibold text-navy/50">ou use as chaves da família</p>
        </div>
      ) : null}

      {emailLogin && !CLIENT_DEV_BYPASS_AUTH ? (
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
          <Link href="/recuperar-senha" className="block text-center text-sm font-bold text-royal">
            Esqueci minha senha
          </Link>
          <button
            type="button"
            className="w-full text-center text-sm font-bold text-royal"
            onClick={() => {
              setEmailLogin(false);
              setError(null);
            }}
          >
            Entrar com as chaves CASA e PAIS
          </button>
        </form>
      ) : (
        <form action={onKeySubmit} className="space-y-4">
          <label className="block text-sm font-semibold">
            <span className="inline-flex items-center">
              Chave da casa
              <HelpTip label="Ajuda sobre a chave da casa">
                Começa com CASA-. Está em Configurações no painel dos pais. Os filhos usam só esta.
              </HelpTip>
            </span>
            <input
              name="kids_access_key"
              required
              placeholder="CASA-XXXXXX"
              autoCapitalize="characters"
              autoComplete="off"
              className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3 outline-none ring-royal focus:ring-2"
            />
          </label>
          <label className="block text-sm font-semibold">
            <span className="inline-flex items-center">
              Chave dos pais
              <HelpTip label="Ajuda sobre a chave dos pais">
                Começa com PAIS-. Quem tem as duas chaves entra no painel neste celular, com os mesmos poderes.
              </HelpTip>
            </span>
            <input
              name="parent_access_key"
              required
              placeholder="PAIS-XXXXXX"
              autoCapitalize="characters"
              autoComplete="off"
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
          {!CLIENT_DEV_BYPASS_AUTH ? (
            <button
              type="button"
              className="w-full text-center text-sm font-bold text-royal"
              onClick={() => {
                setEmailLogin(true);
                setError(null);
              }}
            >
              Entrar com e-mail e senha
            </button>
          ) : null}
        </form>
      )}

      <p className="mt-4 text-center text-sm text-navy/70">
        Ainda não tem família?{" "}
        <Link href="/cadastro" className="font-bold text-royal">
          Criar conta
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-navy/70">
        É filho(a)?{" "}
        <Link href="/entrar" className="font-bold text-royal">
          Entrar com a chave
        </Link>
      </p>
    </div>
  );
}
