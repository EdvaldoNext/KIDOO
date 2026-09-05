"use client";

import { useState } from "react";
import { CLIENT_DEV_BYPASS_AUTH } from "@/lib/config";

export function EnterTestAppButton({
  label = "Ir para o app agora",
  redirectTo = "/app",
  buttonClassName = "w-full rounded-xl bg-success px-4 py-3 font-bold text-navy disabled:opacity-60",
}: {
  label?: string;
  redirectTo?: string;
  buttonClassName?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!CLIENT_DEV_BYPASS_AUTH) return null;

  async function enter() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/dev/enter-test", { method: "POST" });
      let payload: { error?: string } = {};
      try {
        payload = (await response.json()) as { error?: string };
      } catch {
        setError("O servidor não respondeu. Confira as variáveis do Supabase na Vercel.");
        return;
      }
      if (!response.ok) {
        setError(payload.error ?? "Não foi possível abrir o app de teste.");
        return;
      }
      window.location.href = redirectTo;
    } catch {
      setError("Não foi possível abrir o app de teste.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={enter}
        className={buttonClassName}
      >
        {pending ? "Abrindo..." : label}
      </button>
      {error ? <p className="text-sm font-semibold text-alert">{error}</p> : null}
    </div>
  );
}
