export const KID_ACCENTS = [
  { ring: "ring-royal/30", bar: "bg-royal", soft: "bg-royal/10", chip: "bg-royal text-white" },
  { ring: "ring-success/40", bar: "bg-success", soft: "bg-success/15", chip: "bg-success text-navy" },
  { ring: "ring-gold/50", bar: "bg-gold", soft: "bg-gold/20", chip: "bg-gold text-navy" },
  { ring: "ring-pending/45", bar: "bg-pending", soft: "bg-pending/15", chip: "bg-pending text-navy" },
] as const;

export function kidAccent(name: string) {
  return KID_ACCENTS[Math.abs(name.length) % KID_ACCENTS.length];
}

const TASK_ICONS: Array<{ test: RegExp; icon: string }> = [
  { test: /cachorr|cão|cao|dog|coco|passear|pet/i, icon: "🐶" },
  { test: /cama|quarto|lençol|lencol/i, icon: "🛏️" },
  { test: /dente|escovar/i, icon: "🪥" },
  { test: /banho|chuveiro/i, icon: "🚿" },
  { test: /louça|louca|prato|cozinha|pia/i, icon: "🍽️" },
  { test: /lixo/i, icon: "🗑️" },
  { test: /roupa|cesta|lavar/i, icon: "👕" },
  { test: /mesa|almoço|almoco|jantar|café|cafe/i, icon: "🍴" },
  { test: /lição|licao|dever|estud|prova|escola|mochila/i, icon: "📚" },
  { test: /brinc|brinquedo/i, icon: "🧸" },
  { test: /planta|jardim|folha/i, icon: "🌱" },
];

export function taskIcon(title: string) {
  return TASK_ICONS.find(({ test }) => test.test(title))?.icon ?? "⭐";
}

export function kidsStatusLabel(status: string) {
  if (status === "awaiting_approval") return "Foto enviada! Os pais estão olhando.";
  if (status === "pending") return "Pode fazer agora";
  if (status === "completed") return "Feito!";
  return status;
}
