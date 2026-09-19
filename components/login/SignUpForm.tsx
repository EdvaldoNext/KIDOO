"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { CLIENT_DEV_BYPASS_AUTH } from "@/lib/config";
import { EnterTestAppButton } from "@/components/dev/EnterTestAppButton";
import { HelpTip } from "@/components/HelpTip";

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const displayName = String(formData.get("display_name") ?? "").trim();
    const familyName = String(formData.get("family_name") ?? "").trim();
    const lgpd = formData.get("lgpd") === "on";

    if (!lgpd) {
      setError("É preciso autorizar o tratamento dos dados.");
      setPending(false);
      return;
    }

    try {
      const response = await fetch(
        CLIENT_DEV_BYPASS_AUTH ? "/api/dev/register-family" : "/api/auth/register-family",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            display_name: displayName,
            family_name: familyName,
            lgpd_accepted: true,
          }),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Não foi possível criar a família.");
        setPending(false);
        return;
      }

      if (!CLIENT_DEV_BYPASS_AUTH) {
        const supabase = createClient();
        const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
        if (signError) {
          setError("Família criada. Entre com o mesmo e-mail e senha.");
          setPending(false);
          return;
        }
      }

      window.location.href = "/app/filhos?primeiro=1";
    } catch {
      setError("Falha de rede ao criar a família.");
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-navy/5 sm:p-8">
      {CLIENT_DEV_BYPASS_AUTH ? (
        <div className="space-y-3">
          <p className="rounded-xl bg-gold/30 px-3 py-2 text-sm font-semibold text-navy">
            Modo teste: sem confirmação de e-mail. Se o cadastro falhar, entre direto no app.
          </p>
          <EnterTestAppButton
            label="Ir para o app agora"
            redirectTo="/app/filhos?primeiro=1"
          />
          <p className="text-center text-xs font-semibold text-navy/50">ou preencha o formulário</p>
        </div>
      ) : null}
      <label className="block text-sm font-semibold">
        <span className="inline-flex items-center">
          Seu nome
          <HelpTip label="Ajuda sobre o seu nome">
            Como você quer aparecer no painel da família. Pode ser só o primeiro nome.
          </HelpTip>
        </span>
        <input name="display_name" required className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3 outline-none ring-royal focus:ring-2" />
      </label>
      <label className="block text-sm font-semibold">
        <span className="inline-flex items-center">
          Nome da família
          <HelpTip label="Ajuda sobre o nome da família">
            Pode ser o sobrenome, tipo Família Silva. Serve para os filhos reconhecerem o app.
          </HelpTip>
        </span>
        <input name="family_name" required minLength={2} className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3 outline-none ring-royal focus:ring-2" />
      </label>
      <label className="block text-sm font-semibold">
        E-mail
        <input name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3 outline-none ring-royal focus:ring-2" />
      </label>
      <label className="block text-sm font-semibold">
        <span className="inline-flex items-center">
          Senha (mín. 8 caracteres)
          <HelpTip label="Ajuda sobre a senha">
            O primeiro responsável usa e-mail e senha. Depois, as chaves CASA e PAIS ficam em Configurações para qualquer celular entrar no painel.
          </HelpTip>
        </span>
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3 outline-none ring-royal focus:ring-2" />
      </label>
      <label className="flex items-start gap-2 text-sm text-navy/80">
        <input name="lgpd" type="checkbox" required className="mt-1" />
        <span>
          Autorizo o tratamento dos dados do(s) meu(s) filho(s) conforme a{" "}
          <Link href="/privacidade" className="font-bold text-royal">
            Política de Privacidade
          </Link>
          .
          <HelpTip label="Ajuda sobre privacidade">
            Os dados das crianças ficam só na sua família. Você pode apagar tudo em Configurações.
          </HelpTip>
        </span>
      </label>
      {error ? <p className="text-sm font-semibold text-alert">{error}</p> : null}
      <button type="submit" disabled={pending} className="w-full rounded-xl bg-royal py-3 font-bold text-white disabled:opacity-60">
        {pending ? "Criando..." : "Criar família"}
      </button>
      <p className="text-center text-sm text-navy/70">
        Já tem as chaves da casa?{" "}
        <Link href="/login" className="font-bold text-royal">
          Entrar
        </Link>
      </p>
    </form>
  );
}
