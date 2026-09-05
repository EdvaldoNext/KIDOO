import Link from "next/link";

type FirstStepsProps = {
  childCount: number;
  openTaskCount: number;
};

export function FirstSteps({ childCount, openTaskCount }: FirstStepsProps) {
  const steps = [
    {
      done: childCount > 0,
      href: "/app/filhos",
      title: "Cadastrar um filho",
      text: "Gere o link e a chave para a criança entrar.",
      disabled: false,
    },
    {
      done: openTaskCount > 0,
      href: "/app/tarefas/nova",
      title: "Criar a primeira tarefa",
      text: "Algo simples, como arrumar a cama.",
      disabled: childCount === 0,
    },
    {
      done: false,
      href: "/app/configuracoes",
      title: "Combinar a recompensa",
      text: "Pontos, mesada ou um combinado da família.",
      disabled: false,
      optional: true,
    },
  ];

  const requiredDone = childCount > 0 && openTaskCount > 0;
  if (requiredDone) return null;

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-navy/5">
      <h2 className="text-lg font-extrabold">Para começar</h2>
      <p className="mt-1 text-sm text-navy/70">Siga nesta ordem. Leva poucos minutos.</p>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={step.href}>
            {step.disabled ? (
              <div className="flex items-start gap-3 rounded-xl bg-canvas px-4 py-3 opacity-60">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy/10 text-sm font-extrabold">
                  {index + 1}
                </span>
                <div>
                  <p className="font-bold">{step.title}</p>
                  <p className="text-sm text-navy/70">Cadastre um filho primeiro.</p>
                </div>
              </div>
            ) : (
              <Link
                href={step.href}
                className="flex items-start gap-3 rounded-xl bg-canvas px-4 py-3 ring-1 ring-navy/5 hover:ring-royal"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-royal text-sm font-extrabold text-white">
                  {step.done ? "✓" : index + 1}
                </span>
                <div>
                  <p className="font-bold">
                    {step.title}
                    {step.optional ? (
                      <span className="ml-2 text-xs font-semibold text-navy/50">opcional</span>
                    ) : null}
                  </p>
                  <p className="text-sm text-navy/70">{step.text}</p>
                </div>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
