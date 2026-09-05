# KIDOO

App familiar para organizar tarefas de casa. Os pais criam as tarefas; as crianças concluem com foto e localização; os pontos viram ranking ou mesada em R$.

Projeto full stack em **Next.js**, **TypeScript** e **Supabase** (Auth, Postgres com RLS e Storage).

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
- Supabase (Auth, banco com RLS, Storage)

## Como rodar

```bash
npm install
cp .env.example .env.local
npm run dev