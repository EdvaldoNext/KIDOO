import Link from "next/link";

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-6 py-12">
      <Link href="/" className="font-bold text-royal">
        ← KIDOO
      </Link>
      <h1 className="text-3xl font-extrabold">Política de Privacidade</h1>
      <p>
        O KIDOO trata dados de crianças sob consentimento dos pais. O pai ou a
        mãe titular da família é o controlador; o KIDOO é o operador.
      </p>
      <p>
        Coletamos apenas o necessário: nome/apelido, faixa etária, fotos das tarefas, horário do servidor e, quando
        o aparelho permitir, o GPS no momento da foto. A foto pode ser enviada sem localização.
      </p>
      <p>
        O rastreador ao vivo é opcional e só liga com consentimento dos pais. Enquanto ativo, o app dos filhos
        envia a posição em primeiro plano para a família. Não é um rastreador com o app fechado, salvo um app
        nativo futuro.
      </p>
      <p>O titular pode excluir a família e todos os dados vinculados, inclusive fotos.</p>
    </article>
  );
}
