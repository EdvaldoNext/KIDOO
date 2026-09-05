# KIDOO

App familiar: pais criam tarefas, filhos concluem com foto, pontos no fim do mês.

## Stack

- Next.js (App Router) em `kidoo/`
- Supabase (Auth, Postgres + RLS, Storage, Realtime)
- Paleta: royal `#187bcd`, navy `#0A2540`, verde `#54C833`, amarelo `#FFC800`

## Acessos (separados)

| Quem | URL |
|------|-----|
| Pai / mãe | `/login` → aba **Sou pai/mãe** → `/app` |
| Filho | `/login` → aba **Sou filho(a)** → `/app/kids` |
| Você (plataforma) | `/admin/login` → `/admin` |

Pais e filhos **nunca** entram no admin. O admin **nunca** usa o login da família.

## Configuração

1. Copie `.env.example` para `.env.local`
2. `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` já apontam ao projeto
3. Cole `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Project Settings → API). Sem isso, criar filho e login com PIN não funcionam.
4. No Auth do Supabase, desative “Confirm email” no desenvolvimento, ou use o e-mail de confirmação.
5. Crie sua conta admin (sign up fora do app ou no dashboard) e rode [`supabase/promote_admin.sql`](supabase/promote_admin.sql)

```bash
npm install
npm run dev
```

Abra http://localhost:3000

## Fotos

Gravadas no bucket `task-photos` com `photo_key` + `storage_provider = supabase`, prontas para migrar depois ao Cloudflare R2.
