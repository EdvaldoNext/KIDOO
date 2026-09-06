import { getAppContext } from "@/lib/app-context";
import { FamilySettingsForm } from "@/components/family/FamilySettingsForm";
import { ParentPageHeader, ParentTrustStrip } from "@/components/family/ParentPageHeader";

export default async function SettingsPage() {
  const { supabase, familyId } = await getAppContext();

  if (!familyId) {
    return (
      <p className="text-navy/70">
        Crie uma família na tela inicial, em Sou pai ou mãe, para ver as configurações.
      </p>
    );
  }

  const { data: family } = await supabase
    .from("families")
    .select("id, name, reward_mode, points_per_currency, currency_amount, reward_note, location_24h_enabled")
    .eq("id", familyId)
    .single();

  if (!family) return <p>Família não encontrada.</p>;

  return (
    <div className="space-y-5">
      <ParentPageHeader
        eyebrow="Combinados da casa"
        title="Configurações"
        subtitle="Recompensa, rastreador ao vivo e o que fazer com os dados."
      />
      <ParentTrustStrip aside="Você pode apagar tudo quando quiser.">
        Fotos, local e pontos ficam só nesta família.
      </ParentTrustStrip>
      <FamilySettingsForm family={family} />
    </div>
  );
}
