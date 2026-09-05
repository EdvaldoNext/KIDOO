import { createClient } from "@/utils/supabase/server";
import { runCloseMonth } from "@/app/admin/actions";

export default async function AdminHealthPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("platform_settings")
    .select("updated_at")
    .eq("id", 1)
    .single();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Saúde</h1>
      <div className="rounded-2xl bg-white p-5 ring-1 ring-navy/5">
        <p className="font-bold">Configurações</p>
        <p className="text-sm text-navy/70">
          Última atualização:{" "}
          {settings?.updated_at
            ? new Date(settings.updated_at).toLocaleString("pt-BR")
            : "—"}
        </p>
      </div>
      <div className="rounded-2xl bg-white p-5 ring-1 ring-navy/5">
        <p className="font-bold">Fechamento mensal</p>
        <p className="mt-1 text-sm text-navy/70">
          Aplica −peso em tarefas de pontos atrasadas ou do mês anterior.
        </p>
        <form action={runCloseMonth}>
          <button className="mt-3 rounded-xl bg-navy px-4 py-2 font-bold text-white">
            Rodar fechamento agora
          </button>
        </form>
      </div>
    </div>
  );
}
