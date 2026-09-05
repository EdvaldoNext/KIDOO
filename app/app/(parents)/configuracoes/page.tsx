import { getAppContext } from "@/lib/app-context";
import { FamilySettingsForm } from "@/components/family/FamilySettingsForm";

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
      <h1 className="text-2xl font-extrabold">Configurações</h1>
      <FamilySettingsForm family={family} />
    </div>
  );
}
