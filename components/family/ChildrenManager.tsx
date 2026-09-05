"use client";

import { useState } from "react";
import Link from "next/link";
import { ageGroupLabel, type AgeGroup } from "@/lib/auth";
import { HelpTip } from "@/components/HelpTip";

type Child = {
  id: string;
  display_name: string;
  age_group: AgeGroup | null;
  invite_code: string | null;
};

export function ChildrenManager({ childrenList }: { childrenList: Child[] }) {
  const [list, setList] = useState(childrenList);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ code: string; pin: string; name: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const response = await fetch("/api/family/create-child", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: formData.get("display_name"),
        age_group: formData.get("age_group"),
        pin: formData.get("pin"),
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      child?: Child;
      pin?: string;
      invite_code?: string;
    };
    if (!response.ok) {
      setError(payload.error ?? "Não foi possível criar.");
      setPending(false);
      return;
    }
    if (payload.child) setList((prev) => [...prev, payload.child!]);
    setCreated({
      code: payload.invite_code ?? "",
      pin: payload.pin ?? "",
      name: payload.child?.display_name ?? "",
    });
    setPending(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={onSubmit} className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-navy/5">
        <h2 className="text-lg font-extrabold">Adicionar filho</h2>
        <label className="block text-sm font-semibold">
          Nome / apelido
          <input name="display_name" required className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3" />
        </label>
        <label className="block text-sm font-semibold">
          <span className="inline-flex items-center">
            Faixa etária
            <HelpTip label="Ajuda sobre a faixa etária">
              Ajusta o tamanho dos botões e textos na tela da criança.
            </HelpTip>
          </span>
          <select name="age_group" required className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3">
            <option value="6_9">6–9 anos</option>
            <option value="10_13">10–13 anos</option>
            <option value="14_plus">14+ anos</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">
          <span className="inline-flex items-center">
            PIN de 4 dígitos
            <HelpTip label="Ajuda sobre o PIN">
              Senha de 4 números que a criança usa para entrar. Anote agora — não mostramos de novo.
            </HelpTip>
          </span>
          <input name="pin" required pattern="[0-9]{4}" maxLength={4} inputMode="numeric" className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3" />
        </label>
        {error ? <p className="text-sm font-semibold text-alert">{error}</p> : null}
        <button disabled={pending} className="rounded-xl bg-royal px-4 py-2 font-bold text-white">
          {pending ? "Criando..." : "Gerar código"}
        </button>
      </form>

      <div className="space-y-3">
        {created ? (
          <div className="rounded-2xl bg-gold/20 p-5 ring-1 ring-gold">
            <p className="font-bold">{created.name} já pode entrar</p>
            <p className="mt-2 text-sm">Código: <span className="font-extrabold">{created.code}</span></p>
            <p className="text-sm">PIN: <span className="font-extrabold">{created.pin}</span></p>
            <p className="mt-2 text-xs text-navy/70">Anote agora. O PIN não aparece de novo.</p>
            <Link
              href="/app/tarefas/nova"
              className="mt-3 inline-block rounded-xl bg-royal px-4 py-2 text-sm font-bold text-white"
            >
              Criar primeira tarefa
            </Link>
          </div>
        ) : null}
        {list.map((child) => (
          <div key={child.id} className="rounded-2xl bg-white p-4 ring-1 ring-navy/5">
            <p className="font-bold">{child.display_name}</p>
            <p className="text-sm text-navy/70">{ageGroupLabel(child.age_group)}</p>
            <div className="mt-1 inline-flex items-center gap-1 font-mono text-sm font-bold text-royal">
              {child.invite_code}
              <HelpTip label="Ajuda sobre o código do filho">
                A criança digita este código e o PIN em Sou filho(a). Sem e-mail.
              </HelpTip>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
