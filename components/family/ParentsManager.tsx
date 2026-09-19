"use client";

import { useState } from "react";
import { HelpTip } from "@/components/HelpTip";
import { ParentPushSetup } from "@/components/pwa/ParentPushSetup";

export function ParentsManager({
  kidsAccessKey,
  parentAccessKey,
}: {
  kidsAccessKey: string | null;
  parentAccessKey: string | null;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-navy/5">
      <div>
        <h2 className="text-lg font-extrabold">Chaves da casa</h2>
        <p className="mt-1 text-sm font-semibold text-navy/70">
          Qualquer celular com as duas chaves entra no painel dos pais, com os mesmos poderes. Não tem limite de
          responsáveis.
        </p>
      </div>

      <div className="space-y-3 rounded-xl bg-royal/10 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
            <div className="inline-flex items-center text-xs font-bold uppercase tracking-wide text-navy/55">
              Chave da família
              <HelpTip label="Ajuda sobre a chave da família">
                Os filhos usam só esta chave para entrar e enviar fotos. Ela identifica esta casa.
              </HelpTip>
            </div>
            <p className="mt-1 text-2xl font-extrabold tracking-wide text-navy">{kidsAccessKey ?? "—"}</p>
          </div>
          {kidsAccessKey ? (
            <button type="button" className="font-bold text-royal" onClick={() => void copy("casa", kidsAccessKey)}>
              {copied === "casa" ? "Copiado" : "Copiar"}
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="inline-flex items-center text-xs font-bold uppercase tracking-wide text-navy/55">
              Chave dos pais
              <HelpTip label="Ajuda sobre a chave dos pais">
                Junto com a chave CASA, abre o painel neste celular. Não dê esta chave para as crianças.
              </HelpTip>
            </div>
            <p className="mt-1 text-2xl font-extrabold tracking-wide text-navy">{parentAccessKey ?? "—"}</p>
          </div>
          {parentAccessKey ? (
            <button type="button" className="font-bold text-royal" onClick={() => void copy("pais", parentAccessKey)}>
              {copied === "pais" ? "Copiado" : "Copiar"}
            </button>
          ) : null}
        </div>
      </div>

      <p className="text-sm font-semibold text-navy/75">
        No outro celular: tela inicial → Já tenho conta → cole as duas chaves → Ativar notificações.
      </p>

      <ParentPushSetup variant="card" />
    </div>
  );
}
