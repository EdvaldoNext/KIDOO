"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function PlatformSettingsForm({
  planLimits,
  featureFlags,
}: {
  planLimits: Record<string, { children: number | null; tasks_per_month: number | null; photo_retention_days: number }>;
  featureFlags: Record<string, boolean>;
}) {
  const [message, setMessage] = useState<string | null>(null);

  async function save(formData: FormData) {
    const supabase = createClient();
    const nextLimits = {
      free: {
        children: Number(formData.get("free_children")),
        tasks_per_month: Number(formData.get("free_tasks")),
        photo_retention_days: Number(formData.get("free_retention")),
      },
      family: {
        children: Number(formData.get("family_children")),
        tasks_per_month: null,
        photo_retention_days: Number(formData.get("family_retention")),
      },
      plus: {
        children: null,
        tasks_per_month: null,
        photo_retention_days: Number(formData.get("plus_retention")),
      },
    };
    const nextFlags = {
      location_24h: formData.get("location_24h") === "on",
      geofencing: false,
      auto_approve: false,
    };
    const { error } = await supabase.rpc("update_platform_settings", {
      p_plan_limits: nextLimits,
      p_feature_flags: nextFlags,
    });
    setMessage(error ? error.message : "Configurações salvas.");
  }

  return (
    <form action={save} className="max-w-xl space-y-4 rounded-2xl bg-white p-6 ring-1 ring-navy/5">
      <h2 className="font-extrabold">Limites de plano</h2>
      <label className="block text-sm font-semibold">
        Free — filhos
        <input name="free_children" type="number" defaultValue={planLimits.free?.children ?? 1} className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-2" />
      </label>
      <label className="block text-sm font-semibold">
        Free — tarefas/mês
        <input name="free_tasks" type="number" defaultValue={planLimits.free?.tasks_per_month ?? 10} className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-2" />
      </label>
      <label className="block text-sm font-semibold">
        Free — retenção fotos (dias)
        <input name="free_retention" type="number" defaultValue={planLimits.free?.photo_retention_days ?? 30} className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-2" />
      </label>
      <label className="block text-sm font-semibold">
        Família — filhos
        <input name="family_children" type="number" defaultValue={planLimits.family?.children ?? 4} className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-2" />
      </label>
      <label className="block text-sm font-semibold">
        Família — retenção fotos (dias)
        <input name="family_retention" type="number" defaultValue={planLimits.family?.photo_retention_days ?? 180} className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-2" />
      </label>
      <label className="block text-sm font-semibold">
        Plus — retenção fotos (dias)
        <input name="plus_retention" type="number" defaultValue={planLimits.plus?.photo_retention_days ?? 730} className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-2" />
      </label>
      <label className="flex gap-2 text-sm font-semibold">
        <input name="location_24h" type="checkbox" defaultChecked={featureFlags.location_24h} disabled />
        Feature 24h (bloqueada no MVP)
      </label>
      <button className="rounded-xl bg-navy px-4 py-2 font-bold text-white">Salvar</button>
      {message ? <p className="text-sm font-bold text-royal">{message}</p> : null}
    </form>
  );
}
