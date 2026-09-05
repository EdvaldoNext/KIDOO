/** Formata prazo da tarefa para exibição em pt-BR (dia da semana, data e horário). */
export function formatTaskDueAt(dueAt: string | null | undefined): string | null {
  if (!dueAt) return null;
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return null;

  const formatted = date.toLocaleString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
