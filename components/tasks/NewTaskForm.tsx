"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { CLIENT_DEV_BYPASS_AUTH } from "@/lib/config";
import { HelpTip } from "@/components/HelpTip";
import Link from "next/link";

type Child = { id: string; display_name: string };

export function NewTaskForm({ childrenList }: { childrenList: Child[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<"points" | "reminder">("points");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const requirePhoto = kind === "points" ? true : formData.get("require_photo") === "on";
    const payload = {
      title: String(formData.get("title")),
      child_id: String(formData.get("child_id")),
      kind,
      description: String(formData.get("description") ?? "") || null,
      weight: kind === "points" ? Number(formData.get("weight") ?? 1) : 0,
      due_at: String(formData.get("due_at") || "") || null,
      require_photo: requirePhoto,
    };

    if (CLIENT_DEV_BYPASS_AUTH) {
      const response = await fetch("/api/dev/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Não foi possível criar a tarefa.");
        setPending(false);
        return;
      }
      router.push("/app/tarefas");
      router.refresh();
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Faça login para criar tarefas.");
      setPending(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("family_id")
      .eq("id", user.id)
      .single();

    const { error: insertError } = await supabase.from("tasks").insert({
      family_id: profile?.family_id,
      created_by: user.id,
      assigned_child_id: payload.child_id,
      kind: payload.kind,
      title: payload.title,
      description: payload.description,
      weight: payload.weight,
      due_at: payload.due_at,
      require_photo: payload.require_photo,
    });

    if (insertError) {
      setError(insertError.message);
      setPending(false);
      return;
    }
    router.push("/app/tarefas");
    router.refresh();
  }

  if (childrenList.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 text-navy/70 ring-1 ring-navy/5">
        <p>Cadastre um filho antes de criar tarefas.</p>
        <Link href="/app/filhos" className="mt-4 inline-block rounded-xl bg-royal px-4 py-2 font-bold text-white">
          Cadastrar filho
        </Link>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="max-w-lg space-y-4 rounded-2xl bg-white p-6 ring-1 ring-navy/5">
      <div>
        <div className="mb-2 inline-flex items-center text-sm font-semibold">
          Tipo da tarefa
          <HelpTip label="Ajuda sobre o tipo da tarefa">
            Pontos: vale para a recompensa do mês e pede foto. Lembrete: só avisa, sem pontuar.
          </HelpTip>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-canvas p-1">
          <button type="button" onClick={() => setKind("points")} className={`rounded-lg py-2 text-sm font-bold ${kind === "points" ? "bg-royal text-white" : ""}`}>
            Com pontos
          </button>
          <button type="button" onClick={() => setKind("reminder")} className={`rounded-lg py-2 text-sm font-bold ${kind === "reminder" ? "bg-royal text-white" : ""}`}>
            Lembrete
          </button>
        </div>
      </div>
      <label className="block text-sm font-semibold">
        Título
        <input name="title" required className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3" />
      </label>
      <label className="block text-sm font-semibold">
        Filho
        <select name="child_id" required className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3">
          {childrenList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.display_name}
            </option>
          ))}
        </select>
      </label>
      {kind === "points" ? (
        <label className="block text-sm font-semibold">
          <span className="inline-flex items-center">
            Quantos pontos vale
            <HelpTip label="Ajuda sobre os pontos">
              Quanto vale esta tarefa. Arrumar a cama = 1. Lavar a louça = 3. Se a família usa mesada, a criança vê isso em R$.
            </HelpTip>
          </span>
          <input name="weight" type="number" min={1} max={20} defaultValue={1} className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3" />
        </label>
      ) : (
        <label className="flex gap-2 text-sm font-semibold">
          <input name="require_photo" type="checkbox" />
          Exigir foto mesmo sem pontos
        </label>
      )}
      <label className="block text-sm font-semibold">
        Prazo (opcional)
        <input name="due_at" type="datetime-local" className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3" />
      </label>
      <label className="block text-sm font-semibold">
        Descrição
        <textarea name="description" rows={3} className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3" />
      </label>
      {kind === "points" ? (
        <p className="text-sm text-navy/70">Foto obrigatória. Sem foto o filho não conclui.</p>
      ) : null}
      {error ? <p className="text-sm font-semibold text-alert">{error}</p> : null}
      <button disabled={pending} className="rounded-xl bg-royal px-5 py-3 font-bold text-white">
        {pending ? "Salvando..." : "Criar tarefa"}
      </button>
    </form>
  );
}
