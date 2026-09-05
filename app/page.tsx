import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { DevModeBanner } from "@/components/DevModeBanner";
import { EnterTestAppButton } from "@/components/dev/EnterTestAppButton";
import { CLIENT_DEV_BYPASS_AUTH } from "@/lib/config";

export default function HomePage() {
  return (
    <div className="min-h-full">
      <DevModeBanner />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <BrandLogo />
        <Link href="/login?modo=pais" className="rounded-xl px-4 py-2 text-sm font-bold text-royal">
          Entrar
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-20 pt-4">
        <p className="text-center text-sm font-bold uppercase tracking-widest text-royal">
          Família organizada
        </p>
        <h1 className="mt-3 text-center text-4xl font-extrabold leading-tight text-navy sm:text-5xl">
          Quem está usando o KIDOO agora?
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-lg text-navy/70">
          Dois caminhos. Pais cadastram a família e os filhos. Filhos entram nas
          tarefas com código e PIN.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <section className="flex flex-col rounded-3xl bg-royal p-8 text-white shadow-sm">
            <p className="text-sm font-bold uppercase tracking-widest text-white/80">Pais</p>
            <h2 className="mt-2 text-3xl font-extrabold">Sou pai ou mãe</h2>
            <p className="mt-3 text-white/85">
              Criar a família, cadastrar os filhos, criar tarefas e aprovar as fotos.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/cadastro"
                className="rounded-2xl bg-white px-5 py-3 text-center font-bold text-royal"
              >
                Começar cadastro
              </Link>
              <Link
                href="/login?modo=pais"
                className="rounded-2xl bg-white/15 px-5 py-3 text-center font-bold text-white ring-1 ring-white/30"
              >
                Já tenho conta
              </Link>
              {CLIENT_DEV_BYPASS_AUTH ? (
                <EnterTestAppButton
                  label="Abrir painel de teste"
                  redirectTo="/app"
                  buttonClassName="w-full rounded-xl bg-white/20 px-4 py-3 font-bold text-white ring-1 ring-white/40 disabled:opacity-60"
                />
              ) : null}
            </div>
          </section>

          <section className="flex flex-col rounded-3xl bg-success p-8 text-navy shadow-sm">
            <p className="text-sm font-bold uppercase tracking-widest text-navy/70">Filhos</p>
            <h2 className="mt-2 text-3xl font-extrabold">Sou filho(a)</h2>
            <p className="mt-3 text-navy/80">
              Entrar com o código e o PIN que seus pais te passaram. Sem e-mail.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/login?modo=filho"
                className="rounded-2xl bg-white px-5 py-3 text-center font-extrabold text-navy"
              >
                Ir para minhas tarefas
              </Link>
              {CLIENT_DEV_BYPASS_AUTH ? (
                <EnterTestAppButton
                  label="Abrir tarefas de teste"
                  redirectTo="/app/kids"
                  buttonClassName="w-full rounded-xl bg-navy px-4 py-3 font-bold text-white disabled:opacity-60"
                />
              ) : null}
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-navy/10 px-6 py-6 text-center text-sm text-navy/60">
        <Link href="/privacidade" className="hover:text-royal">
          Privacidade
        </Link>
        <span className="mx-2">·</span>
        <Link href="/termos" className="hover:text-royal">
          Termos
        </Link>
      </footer>
    </div>
  );
}
