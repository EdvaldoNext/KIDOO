export const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  awaiting_approval: "Aguardando aprovação",
  completed: "Concluída",
  expired: "Expirada",
};

export const STATUS_CLASS: Record<string, string> = {
  pending: "bg-pending/15 text-navy",
  awaiting_approval: "bg-gold/20 text-navy",
  completed: "bg-success/15 text-navy",
  expired: "bg-navy/10 text-navy/70",
};
