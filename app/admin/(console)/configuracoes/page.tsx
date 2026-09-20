import { createClient } from "@/utils/supabase/server";
import { PlatformSettingsForm } from "@/components/admin/PlatformSettingsForm";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("plan_limits, feature_flags")
    .eq("id", 1)
    .single();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Configurações da plataforma</h1>
      <p className="text-sm text-navy/65">
        Fotos de tarefa vivem 15 dias depois da decisão do pai. Pontos, data e local não são apagados.
      </p>
      <PlatformSettingsForm
        planLimits={data?.plan_limits ?? {}}
        featureFlags={data?.feature_flags ?? { location_24h: false }}
      />
    </div>
  );
}
