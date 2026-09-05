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
    const response = await fetch("/api/dev/enter-test", { method: "POST" });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Não foi possível abrir o app de teste.");
      setPending(false);
      return;
    }
    window.location.href = redirectTo;
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
