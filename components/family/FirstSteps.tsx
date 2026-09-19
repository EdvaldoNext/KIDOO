import Link from "next/link";

type FirstStepsProps = {
  childCount: number;
  hasTask: boolean;
};

export function FirstSteps({ childCount, hasTask }: FirstStepsProps) {
  const hasChild = childCount > 0;
  if (hasChild && hasTask) return null;

  const steps = [
    {
      done: hasChild,
      href: "/app/filhos",
      title: "Cadastrar o filho",
      text: "Passe a chave CASA no celular dele.",
      cta: "Cadastrar agora",
      locked: false,
    },
    {
      done: hasTask,
      href: "/app/tarefas/nova",
      title: "Criar uma tarefa",
      text: "Ele faz, manda a foto e você aprova.",
      cta: "Criar agora",
      locked: !hasChild,
    },
    {
      done: false,
      href: "/app/configuracoes",
      title: "Combinar a recompensa",
      text: "Pontos ou mesada, se quiser.",
      cta: "Abrir combinado",
      locked: false,
      optional: true,
    },
  ] as const;

  const currentIndex = steps.findIndex((step) => !step.done && !step.locked);
  const current = currentIndex >= 0 ? currentIndex + 1 : steps.length;

  return (
    <section aria-labelledby="onboarding-title" className="rounded-2xl bg-white p-5 ring-1 ring-navy/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="onboarding-title" className="text-lg font-extrabold">
            Como usar
          </h2>
          <p className="mt-1 text-sm text-navy/70">Você cria. O filho faz. Você aprova.</p>
        </div>
        <p className="shrink-0 text-xs font-bold uppercase tracking-wide text-navy/45" aria-live="polite">
          Passo {current} de {steps.length}
        </p>
      </div>

      <ol className="mt-4 space-y-2">
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          const mark = step.done ? "✓" : index + 1;

          if (step.locked) {
            return (
              <li
                key={step.href}
                className="flex items-start gap-3 rounded-xl bg-canvas px-4 py-3 opacity-60"
              >
                <span
                  aria-hidden
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy/10 text-sm font-extrabold"
                >
                  {mark}
                </span>
                <div>
                  <p className="font-bold">{step.title}</p>
                  <p className="text-sm text-navy/70">Cadastre o filho primeiro.</p>
                </div>
              </li>
            );
          }

          return (
            <li key={step.href}>
              <Link
                href={step.href}
                aria-current={isCurrent ? "step" : undefined}
                className={
                  isCurrent
                    ? "flex items-start gap-3 rounded-xl bg-royal/10 px-4 py-3 ring-2 ring-royal"
                    : "flex items-start gap-3 rounded-xl bg-canvas px-4 py-3 ring-1 ring-navy/5 hover:ring-royal"
                }
              >
                <span
                  aria-hidden
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-extrabold ${
                    step.done ? "bg-success text-navy" : isCurrent ? "bg-royal text-white" : "bg-navy/10"
                  }`}
                >
                  {mark}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {isCurrent ? <span className="sr-only">Agora: </span> : null}
                    {step.title}
                    {step.optional ? (
                      <span className="ml-2 text-xs font-semibold text-navy/50">opcional</span>
                    ) : null}
                  </p>
                  <p className="text-sm text-navy/70">{step.text}</p>
                  {isCurrent ? (
                    <span className="mt-2 inline-flex rounded-lg bg-royal px-3 py-1.5 text-sm font-bold text-white">
                      {step.cta}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
