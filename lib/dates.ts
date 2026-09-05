export function monthKey(iso: string | Date) {
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey() {
  return monthKey(new Date()) ?? "";
}

export function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  const label = new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function uniqueMonthKeys(dates: Array<string | Date | null | undefined>) {
  const keys = new Set<string>();
  for (const value of dates) {
    if (!value) continue;
    const key = monthKey(value);
    if (key) keys.add(key);
  }
  return [...keys].sort((a, b) => b.localeCompare(a));
}

/** Ano atual completo + qualquer outro ano que já tenha registro. */
export function selectableMonthKeys(dates: Array<string | Date | null | undefined> = []) {
  const years = new Set<number>([new Date().getFullYear()]);
  for (const key of uniqueMonthKeys(dates)) {
    years.add(Number(key.slice(0, 4)));
  }

  const keys: string[] = [];
  for (const year of [...years].sort((a, b) => b - a)) {
    for (let month = 12; month >= 1; month -= 1) {
      keys.push(`${year}-${String(month).padStart(2, "0")}`);
    }
  }
  return keys;
}

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

/** Prazo em linguagem mais próxima da criança (hoje / amanhã / passou). */
export function formatKidsDueAt(dueAt: string | null | undefined): string | null {
  if (!dueAt) return null;
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return null;

  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const startDue = new Date(date);
  startDue.setHours(0, 0, 0, 0);
  const days = Math.round((startDue.getTime() - startToday.getTime()) / 86_400_000);
  const full = formatTaskDueAt(dueAt);

  if (days < 0) return `Passou do prazo · ${full}`;
  if (days === 0) return `É hoje, até ${time}`;
  if (days === 1) return `Até amanhã, ${time}`;
  return `Fazer até: ${full}`;
}
