"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ageGroupLabel, type AgeGroup } from "@/lib/auth";
import { HelpTip } from "@/components/HelpTip";
import { KidAvatar } from "@/components/kids/KidAvatar";
import { KidsAccessCard } from "@/components/family/KidsAccessCard";

type Child = {
  id: string;
  display_name: string;
  age_group: AgeGroup | null;
};

export function ChildrenManager({
  childrenList,
  kidsAccessKey,
}: {
  childrenList: Child[];
  kidsAccessKey: string | null;
}) {
  const [list, setList] = useState(childrenList);
  const [error, setError] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string | null>(null);
  const [accessKey, setAccessKey] = useState(kidsAccessKey);
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (accessKey) return;
    let cancelled = false;
    fetch("/api/family/kids-access")
      .then(async (response) => {
        const payload = (await response.json()) as { key?: string };
        if (!cancelled && response.ok && payload.key) setAccessKey(payload.key);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [accessKey]);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const response = await fetch("/api/family/create-child", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: formData.get("display_name"),
        age_group: formData.get("age_group"),
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      child?: Child;
      kids_access_key?: string;
    };
    if (!response.ok) {
      setError(payload.error ?? "Não foi possível criar.");
      setPending(false);
      return;
    }
    if (payload.child) setList((prev) => [...prev, payload.child!]);
    if (payload.kids_access_key) setAccessKey(payload.kids_access_key);
    setCreatedName(payload.child?.display_name ?? "");
    setPending(false);
  }

  async function saveChild(childId: string, formData: FormData) {
    setBusyId(childId);
    setError(null);
    const response = await fetch(`/api/family/child/${childId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: formData.get("display_name"),
        age_group: formData.get("age_group"),
      }),
    });
    const payload = (await response.json()) as { error?: string; child?: Child };
    if (!response.ok || !payload.child) {
      setError(payload.error ?? "Não foi possível salvar.");
      setBusyId(null);
      return;
    }
    setList((prev) => prev.map((child) => (child.id === childId ? payload.child! : child)));
    setEditingId(null);
    setBusyId(null);
  }

  async function deleteChild(child: Child) {
    if (!confirm(`Apagar ${child.display_name}? As tarefas e os pontos dele também saem.`)) {
      return;
    }
    setBusyId(child.id);
    setError(null);
    const response = await fetch(`/api/family/child/${child.id}`, { method: "DELETE" });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Não foi possível excluir.");
      setBusyId(null);
      return;
    }
    setList((prev) => prev.filter((item) => item.id !== child.id));
    if (editingId === child.id) setEditingId(null);
    setBusyId(null);
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
        {error ? <p className="text-sm font-semibold text-alert">{error}</p> : null}
        <button disabled={pending} className="rounded-xl bg-royal px-4 py-2 font-bold text-white">
          {pending ? "Criando..." : "Cadastrar filho"}
        </button>
      </form>

      <div className="space-y-3">
        {error ? <p className="text-sm font-semibold text-alert">{error}</p> : null}
        {accessKey ? <KidsAccessCard accessKey={accessKey} childName={createdName ?? undefined} /> : null}
        {createdName ? (
          <Link
            href="/app/tarefas/nova"
            className="inline-block rounded-xl bg-royal px-4 py-2 text-sm font-bold text-white"
          >
            Criar primeira tarefa
          </Link>
        ) : null}
        {list.map((child) => (
          <div key={child.id} className="rounded-2xl bg-white p-4 ring-1 ring-navy/5">
            {editingId === child.id ? (
              <form action={(formData) => void saveChild(child.id, formData)} className="space-y-3">
                <label className="block text-sm font-semibold">
                  Nome / apelido
                  <input
                    name="display_name"
                    required
                    defaultValue={child.display_name}
                    className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Faixa etária
                  <select
                    name="age_group"
                    required
                    defaultValue={child.age_group ?? "6_9"}
                    className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3"
                  >
                    <option value="6_9">6–9 anos</option>
                    <option value="10_13">10–13 anos</option>
                    <option value="14_plus">14+ anos</option>
                  </select>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={busyId === child.id}
                    className="rounded-xl bg-royal px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {busyId === child.id ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-xl bg-canvas px-4 py-2 text-sm font-bold text-navy"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-3">
                <KidAvatar name={child.display_name} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold capitalize">{child.display_name}</p>
                  <p className="text-sm text-navy/70">{ageGroupLabel(child.age_group)}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(child.id);
                      setError(null);
                    }}
                    className="rounded-xl bg-canvas px-3 py-2 text-sm font-bold text-royal"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={busyId === child.id}
                    onClick={() => void deleteChild(child)}
                    className="rounded-xl bg-alert/10 px-3 py-2 text-sm font-bold text-alert disabled:opacity-60"
                  >
                    {busyId === child.id ? "Excluindo..." : "Excluir"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
