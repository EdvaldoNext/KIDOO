"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ApprovalActions({ completionId }: { completionId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setPending(true);
    setError(null);
    const rejectNote = approve ? null : note.trim() || null;

    try {
      const response = await fetch("/api/family/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completion_id: completionId,
          approve,
          note: rejectNote,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Não deu para salvar agora.");
        return;
      }
      setRejecting(false);
      setNote("");
      router.refresh();
    } catch {
      setError("Não deu para salvar agora. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  if (rejecting) {
    return (
      <div className="space-y-3 rounded-xl bg-canvas p-3">
        <label className="block text-sm font-bold">
          Pedido de ajuste
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={280}
            rows={3}
            placeholder="O que falta para ficar bom? (opcional)"
            className="mt-1 w-full resize-y rounded-xl border border-navy/10 bg-white px-3 py-2 text-sm font-semibold outline-none ring-royal focus:ring-2"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => void decide(false)}
            className="rounded-xl bg-alert px-4 py-2 font-bold text-white disabled:opacity-60"
          >
            {pending ? "Enviando..." : "Pedir ajuste"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setRejecting(false);
              setNote("");
              setError(null);
            }}
            className="rounded-xl bg-white px-4 py-2 font-bold ring-1 ring-navy/10"
          >
            Cancelar
          </button>
        </div>
        {error ? (
          <p className="text-sm font-semibold text-alert" role="status" aria-live="polite">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => void decide(true)}
          className="rounded-xl bg-success px-4 py-2 font-bold text-navy disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Aprovar"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setRejecting(true);
            setError(null);
          }}
          className="rounded-xl bg-alert px-4 py-2 font-bold text-white disabled:opacity-60"
        >
          Pedir ajuste
        </button>
      </div>
      {error ? (
        <p className="text-sm font-semibold text-alert" role="status" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}
