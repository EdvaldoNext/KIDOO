type RejectionFeedbackProps = {
  note: string | null;
  className?: string;
};

export function RejectionFeedback({ note, className = "" }: RejectionFeedbackProps) {
  return (
    <div className={`rounded-xl bg-alert/10 px-4 py-3 ring-1 ring-alert/20 ${className}`}>
      <p className="text-sm font-extrabold text-alert">
        {note ? "Os pais pediram para ajustar:" : "Os pais pediram para refazer esta tarefa."}
      </p>
      {note ? <p className="mt-1 text-sm font-semibold text-navy">“{note}”</p> : null}
    </div>
  );
}

/** Mantém só a rejeição mais recente por tarefa. */
export function latestRejectionByTask(
  rows: { task_id: string; rejection_note: string | null; rejected_at: string }[],
): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const row of rows) {
    if (map.has(row.task_id)) continue;
    map.set(row.task_id, row.rejection_note);
  }
  return map;
}
