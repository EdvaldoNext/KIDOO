import { getAppContext } from "@/lib/app-context";
import { FamilySettingsForm } from "@/components/family/FamilySettingsForm";
import { ParentsManager } from "@/components/family/ParentsManager";
import { ParentPageHeader, ParentTrustStrip } from "@/components/family/ParentPageHeader";
import { ensureParentAccessKey } from "@/lib/parent-invite";
import { ensureKidsAccessKey } from "@/lib/kids-access";
import { createServiceClient } from "@/utils/supabase/admin";

export default async function SettingsPage() {
  const { supabase, familyId } = await getAppContext();

  if (!familyId) {
    return (
      <p className="text-navy/70">
        Crie uma família na tela inicial, em Sou pai ou mãe, para ver as configurações.
      </p>
    );
  }

  const admin = createServiceClient();
  const [{ data: family }, kidsAccessKey, parentAccessKey] = await Promise.all([
    supabase
      .from("families")
      .select("id, name, reward_mode, points_per_currency, currency_amount, reward_note, location_24h_enabled")
      .eq("id", familyId)
      .single(),
    ensureKidsAccessKey(admin, familyId),
    ensureParentAccessKey(admin, familyId),
  ]);

  if (!family) return <p>Família não encontrada.</p>;

  return (
    <div className="space-y-5">
      <ParentPageHeader
        eyebrow="Combinados da casa"
        title="Configurações"
        subtitle="Chaves da casa, recompensa, rastreador e dados da família."
      />
      <ParentTrustStrip aside="Guarde as duas chaves.">
        CASA é dos filhos. PAIS abre o painel em qualquer celular responsável.
      </ParentTrustStrip>
      <ParentsManager kidsAccessKey={kidsAccessKey} parentAccessKey={parentAccessKey} />
      <FamilySettingsForm family={family} />
    </div>
  );
}
