"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CLIENT_DEV_BYPASS_AUTH } from "@/lib/config";
import { EnterTestAppButton } from "@/components/dev/EnterTestAppButton";
import { KidAvatar } from "@/components/kids/KidAvatar";
import { KIDS_KEY_PATTERN, normalizeKidsAccessKey, type KidsDoorChild } from "@/lib/kids-access";

export function KidsEnterFlow() {
  const searchParams = useSearchParams();
  const switchChild = searchParams.get("trocar") === "1";
  const [step, setStep] = useState<"key" | "who">(switchChild ? "who" : "key");
  const [key, setKey] = useState("");
  const [children, setChildren] = useState<KidsDoorChild[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!switchChild) return;
    let cancelled = false;

    async function loadSiblings() {
      setPending(true);
      const response = await fetch("/api/auth/kids-door");
      const payload = (await response.json()) as { children?: KidsDoorChild[]; error?: string };
      if (cancelled) return;
      if (!response.ok || !payload.children) {
        setStep("key");
        setPending(false);
        return;
      }
      setChildren(payload.children);
      setPending(false);
    }

    void loadSiblings();
    return () => {
      cancelled = true;
    };
  }, [switchChild]);

  async function submitKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const normalized = normalizeKidsAccessKey(key);
    const response = await fetch("/api/auth/kids-door", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: normalized }),
    });
    const payload = (await response.json()) as { children?: KidsDoorChild[]; error?: string };
    if (!response.ok || !payload.children) {
      setError(payload.error ?? "Chave inválida.");
      setPending(false);
      return;
    }
    if (payload.children.length === 0) {
      setError("Ainda não tem filho cadastrado nessa família.");
      setPending(false);
      return;
    }
    setKey(normalized);
    setChildren(payload.children);
    if (payload.children.length === 1) {
      await enterAs(payload.children[0].id, normalized);
      return;
    }
    setStep("who");
    setPending(false);
  }

  async function enterAs(childId: string, accessKey = key) {
    setPending(true);
    setError(null);
    const response = await fetch("/api/auth/child-enter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ child_id: childId, key: accessKey || undefined }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Não foi possível entrar.");
      setPending(false);
      return;
    }
    window.location.href = "/app/kids";
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {step === "key" ? (
        <form onSubmit={submitKey} className="space-y-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-navy/5 sm:p-8">
          <h1 className="text-2xl font-extrabold">Entrar nas tarefas</h1>
          <p className="text-navy/70">Digite a chave que seus pais te enviaram.</p>
          <label className="block text-sm font-semibold">
            Chave da família
            <input
              value={key}
              onChange={(event) => setKey(event.target.value.toUpperCase())}
              required
              placeholder="CASA-XXXXXX"
              autoCapitalize="characters"
              autoComplete="one-time-code"
              className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3 uppercase outline-none ring-royal focus:ring-2"
            />
          </label>
          {error ? <p className="text-sm font-semibold text-alert">{error}</p> : null}
          <button
            type="submit"
            disabled={pending || !KIDS_KEY_PATTERN.test(normalizeKidsAccessKey(key))}
            className="w-full rounded-xl bg-success py-3 font-extrabold text-navy disabled:opacity-60"
          >
            {pending ? "Abrindo..." : "Continuar"}
          </button>
        </form>
      ) : (
        <div className="space-y-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-navy/5 sm:p-8">
          <h1 className="text-2xl font-extrabold">Quem é você?</h1>
          <p className="text-navy/70">Toque no seu nome para ver as tarefas.</p>
          <div className="grid gap-3">
            {children.map((child) => (
              <button
                key={child.id}
                type="button"
                disabled={pending}
                onClick={() => void enterAs(child.id)}
                className="flex items-center gap-4 rounded-2xl bg-canvas px-4 py-3 text-left ring-1 ring-navy/10 hover:ring-royal disabled:opacity-60"
              >
                <KidAvatar name={child.display_name} size="lg" />
                <span className="text-xl font-extrabold capitalize">{child.display_name}</span>
              </button>
            ))}
          </div>
          {error ? <p className="text-sm font-semibold text-alert">{error}</p> : null}
          <button
            type="button"
            className="text-sm font-bold text-royal"
            onClick={() => {
              setStep("key");
              setError(null);
            }}
          >
            Usar outra chave
          </button>
        </div>
      )}

      {CLIENT_DEV_BYPASS_AUTH ? (
        <EnterTestAppButton
          label="Abrir tarefas de teste"
          redirectTo="/app/kids"
          buttonClassName="w-full rounded-xl bg-navy px-4 py-3 font-bold text-white disabled:opacity-60"
        />
      ) : null}
    </div>
  );
}
