"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { HelpTip } from "@/components/HelpTip";

export function OnboardingForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("register_parent", {
      p_family_name: String(formData.get("family_name") ?? ""),
      p_display_name: String(formData.get("display_name") ?? ""),
      p_lgpd_accepted: formData.get("lgpd") === "on",
    });
    if (rpcError) {
      setError(rpcError.message);
      setPending(false);
      return;
    }
    await supabase.auth.refreshSession();
    window.location.href = "/app/filhos?primeiro=1";
  }

  return (
    <form action={onSubmit} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-extrabold">Complete sua família</h1>
      <label className="block text-sm font-semibold">
        Seu nome
        <input name="display_name" required className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3" />
      </label>
      <label className="block text-sm font-semibold">
        <span className="inline-flex items-center">
          Nome da família
          <HelpTip label="Ajuda sobre o nome da família">
            Pode ser o sobrenome, tipo Família Silva. Serve para os filhos reconhecerem o app.
          </HelpTip>
        </span>
        <input name="family_name" required className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3" />
      </label>
      <label className="flex gap-2 text-sm">
        <input name="lgpd" type="checkbox" required className="mt-1" />
        Autorizo o tratamento dos dados conforme a política de privacidade.
      </label>
      {error ? <p className="text-sm font-semibold text-alert">{error}</p> : null}
      <button disabled={pending} className="w-full rounded-xl bg-royal py-3 font-bold text-white">
        {pending ? "Salvando..." : "Entrar no painel"}
      </button>
    </form>
  );
}
