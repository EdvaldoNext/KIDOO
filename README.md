# KIDOO

App familiar para organizar tarefas de casa. Os pais criam as tarefas; as crianças concluem com foto e localização; os pontos viram ranking ou mesada em R$.

Projeto full stack em **Next.js**, **TypeScript**, **Turso** (banco libSQL) e **Cloudflare R2** (fotos).

## O que o app faz

- Cadastro da família e dos filhos (código + PIN)
- Tarefas com pontos ou só lembrete
- Conclusão com foto e GPS
- Aprovação pelos pais
- Placar do mês e conversão de pontos em mesada
- Painel admin separado da área da família

## Stack

- Next.js 16 (App Router) e React 19
- TypeScript
- Tailwind CSS 4
- Turso / libSQL (banco, contas e sessões próprias, regras de acesso em `lib/backend/policies.ts`)
- Cloudflare R2 (fotos privadas, URLs assinadas)
- Resend (e-mail de recuperação de senha)

## Como rodar

```bash
npm install
cp .env.example .env.local
npm run db:setup      # cria as tabelas (use TURSO_DATABASE_URL=file:./.data/kidoo.db para testar local)
npm run db:promote-admin -- admin@dominio.com "senha-forte"   # opcional: conta admin
npm run dev