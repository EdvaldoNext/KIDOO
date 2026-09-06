"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { CLIENT_DEV_BYPASS_AUTH } from "@/lib/config";
import { HelpTip } from "@/components/HelpTip";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "@/lib/rewards";

type Family = {
  id: string;
  name: string;
  reward_mode: "points" | "symbolic" | "allowance";
  points_per_currency: number | null;
  currency_amount: number | null;
  reward_note: string | null;
  location_24h_enabled: boolean;
};

export function FamilySettingsForm({ family }: { family: Family }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [rewardMode, setRewardMode] = useState(family.reward_mode);
  const [amountInput, setAmountInput] = useState(formatMoneyInput(family.currency_amount ?? 2));
  const parsedAmount = parseMoneyInput(amountInput);

  async function save(formData: FormData) {
    const nextMode = String(formData.get("reward_mode"));
    const currencyAmount =
      nextMode === "allowance" ? parseMoneyInput(formData.get("currency_amount") ?? amountInput) : parseMoneyInput(formData.get("currency_amount"));

    if (nextMode === "allowance" && currencyAmount == null) {
      setMessage("Informe um valor por ponto maior que zero. Pode usar 0,38 ou 0.38.");
      return;
    }

    const payload = {
      name: String(formData.get("name")),
      reward_mode: nextMode,
      points_per_currency: Number(formData.get("points_per_currency") || 0) || null,
      currency_amount: currencyAmount,
      reward_note: String(formData.get("reward_note") || "") || null,
    };

    if (CLIENT_DEV_BYPASS_AUTH) {
      const response = await fetch("/api/dev/family", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      setMessage(result.error ?? "Salvo.");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("families").update(payload).eq("id", family.id);
    setMessage(error ? error.message : "Salvo.");
  }

  async function saveLocation(formData: FormData) {
    const enabled = formData.get("location_24h_enabled") === "on";
    const payload = { location_24h_enabled: enabled };

    if (CLIENT_DEV_BYPASS_AUTH) {
      const response = await fetch("/api/dev/family", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      setMessage(result.error ?? (enabled ? "Rastreador ligado." : "Rastreador desligado."));
      if (!result.error) router.refresh();
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("families").update(payload).eq("id", family.id);
    setMessage(error ? error.message : enabled ? "Rastreador ligado." : "Rastreador desligado.");
    if (!error) router.refresh();
  }

  async function wipe() {
    if (!confirm("Apagar a família e todos os dados (fotos, tarefas, pontos)?")) return;

    if (CLIENT_DEV_BYPASS_AUTH) {
      const response = await fetch("/api/dev/family", { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (result.error) {
        setMessage(result.error);
        return;
      }
      window.location.href = "/";
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.rpc("delete_my_family");
    if (error) {
      setMessage(error.message);
      return;
    }
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="max-w-lg space-y-6">
      <form action={save} className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-navy/5">
        <h2 className="text-lg font-extrabold">A casa</h2>
        <label className="block text-sm font-semibold">
          Nome da família
          <input name="name" defaultValue={family.name} className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3" />
        </label>
        <label className="block text-sm font-semibold">
          <span className="inline-flex items-center">
            Recompensa
            <HelpTip label="Ajuda sobre a recompensa">
              Só pontos = ranking no fim do mês. Mesada = cada ponto vira R$ e a criança vê o valor. Simbólico = um combinado sem dinheiro.
            </HelpTip>
          </span>
          <select
            name="reward_mode"
            value={rewardMode}
            onChange={(event) => setRewardMode(event.target.value as Family["reward_mode"])}
            className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3"
          >
            <option value="points">Só pontos</option>
            <option value="symbolic">Dinheiro simbólico</option>
            <option value="allowance">Mesada (conversão em R$)</option>
          </select>
        </label>
        {rewardMode === "allowance" ? (
          <>
            <input type="hidden" name="points_per_currency" value="1" />
            <label className="block text-sm font-semibold">
              <span className="inline-flex items-center">
                Valor por ponto (R$)
                <HelpTip label="Ajuda sobre o valor por ponto">
                  Qualquer valor, com vírgula ou ponto. Ex.: 0,38. Se a criança ganhou 10 pontos, vê R$ 3,80.
                </HelpTip>
              </span>
              <input
                name="currency_amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,38"
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
                className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3"
              />
              {parsedAmount ? (
                <p className="mt-1 text-sm font-semibold text-navy/60">
                  Exemplo: 10 pontos = {formatMoney(10 * parsedAmount)}
                </p>
              ) : (
                <p className="mt-1 text-sm font-semibold text-alert">Use um número como 0,38 ou 2,5.</p>
              )}
            </label>
          </>
        ) : (
          <>
            <input type="hidden" name="points_per_currency" value={family.points_per_currency ?? 1} />
            <input type="hidden" name="currency_amount" value={family.currency_amount ?? 2} />
          </>
        )}
        {rewardMode !== "points" ? (
          <label className="block text-sm font-semibold">
            Recompensa alternativa
            <input name="reward_note" defaultValue={family.reward_note ?? ""} placeholder="Ex.: um passeio no fim de semana" className="mt-1 w-full rounded-xl border border-navy/10 bg-canvas px-3 py-3" />
          </label>
        ) : (
          <input type="hidden" name="reward_note" value={family.reward_note ?? ""} />
        )}
        <button className="rounded-xl bg-royal px-4 py-2 font-bold text-white">Salvar</button>
        {message ? <p className="text-sm font-semibold text-royal">{message}</p> : null}
      </form>

      <form action={saveLocation} className="space-y-3 rounded-2xl bg-white p-6 ring-1 ring-navy/5">
        <p className="font-extrabold">Dois tipos de localização</p>
        <p className="text-sm text-navy/70">
          O local da foto vai na aprovação e no{" "}
          <a href="/app/localizacao" className="font-bold text-royal hover:underline">
            histórico de tarefas
          </a>
          . Não é obrigatório para concluir.
        </p>
        <label className="flex items-start gap-3 text-sm font-semibold">
          <input
            name="location_24h_enabled"
            type="checkbox"
            defaultChecked={family.location_24h_enabled}
            className="mt-1 h-4 w-4 accent-royal"
          />
          <span>
            Ligar rastreador ao vivo
            <span className="mt-1 block font-medium text-navy/60">
              No app Android KIDOO Filhos, envia a posição mesmo com o app fechado. No navegador, só com a
              página aberta. Não substitui o GPS da foto.
            </span>
          </span>
        </label>
        <button className="rounded-xl bg-royal px-4 py-2 font-bold text-white">Salvar localização</button>
        {message ? <p className="text-sm font-semibold text-royal">{message}</p> : null}
        <p className={`text-sm font-bold ${family.location_24h_enabled ? "text-alert" : "text-navy/55"}`}>
          {family.location_24h_enabled
            ? "Rastreador ao vivo ligado. Sem sinal se o app dos filhos estiver fechado."
            : "Rastreador ao vivo desligado."}
        </p>
      </form>

      <button onClick={wipe} className="text-sm font-bold text-alert">
        Excluir família e dados (LGPD)
      </button>
    </div>
  );
}
