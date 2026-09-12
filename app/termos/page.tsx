import Link from "next/link";

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-6 py-12">
      <Link href="/" className="font-bold text-royal">
        ← KIDOO
      </Link>
      <h1 className="text-3xl font-extrabold">Termos de uso</h1>
      <p>
        O KIDOO é um aplicativo familiar para organizar tarefas domésticas com
        prova em foto. Pais criam tarefas; filhos concluem. Pontos e recompensas
        são definidos pela família. O dinheiro da mesada é entregue fora do app;
        o KIDOO só registra quando ela já foi paga, sem apagar o total do mês.
      </p>
      <p>Contas de filhos são vinculadas à família e não possuem faturamento próprio.</p>
      <p>O painel /admin é exclusivo da operação da plataforma e não faz parte do produto da família.</p>
    </article>
  );
}
