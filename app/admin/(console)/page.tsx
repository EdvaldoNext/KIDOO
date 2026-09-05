import { createClient } from "@/utils/supabase/server";

type Stats = {
  families_total: number;
  families_active: number;
  families_7d: number;
  parents: number;
  children: number;
  tasks_total: number;
  completions_total: number;
  photos_total: number;
  approval_rate: number;
  plans: Record<string, number>;
};

export default async function AdminHomePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_dashboard_stats");
  const stats = (data ?? {}) as Stats;

  const cards = [
    ["Famílias", stats.families_total],
    ["Ativas", stats.families_active],
    ["Novas (7d)", stats.families_7d],
    ["Pais", stats.parents],
    ["Filhos", stats.children],
    ["Tarefas", stats.tasks_total],
    ["Conclusões", stats.completions_total],
    ["Fotos", stats.photos_total],
    ["Aprovação %", stats.approval_rate],
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Analytics da plataforma</h1>
      {error ? <p className="text-alert">{error.message}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl bg-white p-5 ring-1 ring-navy/5">
            <p className="text-sm font-bold text-navy/60">{label}</p>
            <p className="mt-2 text-3xl font-extrabold text-royal">{value ?? 0}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-white p-5 ring-1 ring-navy/5">
        <p className="font-bold">Planos</p>
        <p className="mt-2 text-sm text-navy/70">
          Free {stats.plans?.free ?? 0} · Família {stats.plans?.family ?? 0} · Plus {stats.plans?.plus ?? 0}
        </p>
      </div>
      <p className="text-xs text-navy/50">
        Este painel mostra só métricas. Fotos de crianças não aparecem aqui.
      </p>
    </div>
  );
}
