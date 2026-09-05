import { createClient } from "@/utils/supabase/server";
import { FamiliesTable } from "@/components/admin/FamiliesTable";

export default async function AdminFamiliesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_families");

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Famílias</h1>
      <p className="text-sm text-navy/70">
        Sem galeria de fotos. Aqui só há métricas e status da conta.
      </p>
      {error ? <p className="text-alert">{error.message}</p> : null}
      <FamiliesTable families={data ?? []} />
    </div>
  );
}
