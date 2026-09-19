import Image from "next/image";
import Link from "next/link";
import welcomeHero from "@/img/logoDelogin.png";
import { BrandLogo } from "@/components/BrandLogo";
import { EnterTestAppButton } from "@/components/dev/EnterTestAppButton";
import { CLIENT_DEV_BYPASS_AUTH } from "@/lib/config";

export function WelcomeScreen() {
  return (
    <div className="flex min-h-full justify-center overflow-y-auto bg-canvas md:items-center md:px-4 md:py-6">
      <div className="flex min-h-full w-full max-w-lg flex-col bg-white md:min-h-[min(52rem,calc(100dvh-5rem))] md:overflow-y-auto md:rounded-[2rem] md:shadow-2xl">
        <div className="relative isolate min-h-[clamp(16.5rem,44svh,26rem)] flex-1 bg-[#e7f3fb] sm:min-h-[clamp(18rem,46svh,30rem)]">
          <Image
            src={welcomeHero}
            alt="Crianças ao redor da marca Kidóó. Tarefas e segurança para as crianças, tranquilidade para os pais."
            fill
            priority
            sizes="(min-width: 1024px) 32rem, (min-width: 640px) 28rem, 100vw"
            className="object-contain object-center p-2 sm:p-3"
          />

          <div className="absolute inset-x-0 top-0 z-10 p-4 sm:p-5">
            <BrandLogo size="sm" wordmark={false} className="ring-2 ring-white" />
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent sm:h-20"
          />
        </div>

        <section className="relative z-10 -mt-5 flex shrink-0 flex-col rounded-t-[2rem] bg-white px-5 pb-6 pt-6 sm:-mt-6 sm:px-8 sm:pt-7">
          <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-royal">
            Família organizada
          </p>
          <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
            <span className="h-1.5 w-5 rounded-full bg-success" />
            <span className="h-1.5 w-1.5 rounded-full bg-navy/15" />
            <span className="h-1.5 w-1.5 rounded-full bg-navy/15" />
          </div>
          <h1 className="mt-3 text-center text-2xl font-extrabold leading-tight text-navy sm:text-3xl">
            Comece pelo cadastro da família
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-center text-sm text-navy/65 sm:text-base">
            Diversão e segurança em só lugar
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/cadastro"
              className="rounded-full bg-success px-5 py-3.5 text-center text-lg font-extrabold text-white shadow-sm"
            >
              Começar cadastro
            </Link>
            <Link
              href="/login?modo=pais"
              className="rounded-full bg-white px-5 py-3.5 text-center text-lg font-extrabold text-navy ring-2 ring-navy/10"
            >
              Já tenho conta
            </Link>
            <Link
              href="/entrar"
              className="py-1 text-center text-sm font-bold text-navy/70 underline-offset-4 hover:underline"
            >
              Entrar nas tarefas
            </Link>

            {CLIENT_DEV_BYPASS_AUTH ? (
              <div className="mt-1 space-y-2 border-t border-navy/10 pt-4">
                <p className="text-center text-xs font-bold uppercase tracking-wider text-navy/40">
                  Modo teste
                </p>
                <EnterTestAppButton
                  label="Abrir painel de teste"
                  redirectTo="/app"
                  buttonClassName="w-full rounded-full bg-canvas px-4 py-2.5 text-sm font-bold text-navy ring-1 ring-navy/10 disabled:opacity-60"
                />
                <EnterTestAppButton
                  label="Abrir tarefas de teste"
                  redirectTo="/app/kids"
                  buttonClassName="w-full rounded-full bg-navy px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                />
              </div>
            ) : null}
          </div>

          <footer className="mt-6 text-center text-xs text-navy/50">
            <Link href="/privacidade" className="hover:text-royal">
              Privacidade
            </Link>
            <span className="mx-2">·</span>
            <Link href="/termos" className="hover:text-royal">
              Termos
            </Link>
          </footer>
        </section>
      </div>
    </div>
  );
}
