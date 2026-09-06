"use client";

import { useState } from "react";
import { KIDS_ENTRY_PATH } from "@/lib/kids-access";
import { prettyName } from "@/lib/names";

export function KidsAccessCard({
  accessKey,
  childName,
}: {
  accessKey: string;
  childName?: string;
}) {
  const [copied, setCopied] = useState<"link" | "key" | null>(null);

  async function copy(kind: "link" | "key") {
    const value = kind === "key" ? accessKey : `${window.location.origin}${KIDS_ENTRY_PATH}`;
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="rounded-2xl bg-gold/20 p-5 ring-1 ring-gold">
      <p className="font-bold">
        {childName ? `${prettyName(childName)} já pode entrar` : "Acesso dos filhos"}
      </p>
      <p className="mt-2 text-sm text-navy/80">
        Abra este link no celular Android do filho. Lá ela toca em{" "}
        <strong>Instalar e permitir localização</strong>. O Android pede a permissão e o ícone fica no
        telefone — sem computador.
      </p>
      <p className="mt-3 font-mono text-lg font-extrabold tracking-wide text-navy">{accessKey}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copy("link")}
          className="rounded-xl bg-royal px-4 py-2 text-sm font-bold text-white"
        >
          {copied === "link" ? "Link copiado" : "Copiar link"}
        </button>
        <button
          type="button"
          onClick={() => void copy("key")}
          className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-navy ring-1 ring-navy/10"
        >
          {copied === "key" ? "Chave copiada" : "Copiar chave"}
        </button>
      </div>
    </div>
  );
}
