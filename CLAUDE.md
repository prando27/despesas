# Racha Conta

App de divisão de despesas compartilhadas entre membros de um grupo.

## Comandos

```bash
docker compose up -d     # PostgreSQL + MinIO (dev)
npm run dev              # Dev server
npm run build            # Build produção
npm run lint             # ESLint
npm run seed             # Seed do banco
npx prisma migrate dev   # Migrations
```

## Stack

- **Next.js 14** (App Router, standalone output)
- **Prisma** com PostgreSQL
- **Better Auth** (email/senha + Google OAuth opcional)
- **S3-compatible storage** (MinIO local, Railway bucket em prod)
- **Tailwind CSS + shadcn/ui**

## Convenções

- UI e mensagens de erro em **português**
- Valores monetários usam Prisma `Decimal(10,2)` — sempre serializar com `serializeDecimal()` antes de retornar JSON
- API routes protegidas usam `getSession()` do Better Auth, validação com Zod `safeParse()`
- Sessões gerenciadas pelo Better Auth via cookie httpOnly
- Cadastro só é permitido via link de convite (não existe cadastro aberto)
- Rotas públicas no middleware: `/login`, `/cadastro`, `/convite`, `/api/auth/*`, `/api/groups/info`
- `NEXT_PUBLIC_` env vars são inlined no build — usar `ARG` no Dockerfile
- `.dockerignore` exclui `.env` para não sobrescrever env vars do Railway
- Inputs devem ter `font-size: 16px` para evitar zoom no Safari iOS
- `input[type="date"]` precisa de `appearance: none` + `max-width: 100%` no Safari iOS (senão ultrapassa o container)

## Estrutura

- `src/app/api/` — API routes (despesas, grupos, resumo, pagamentos, OCR, auth)
- `src/app/(pages)/` — Páginas (login, cadastro, despesas, resumo, grupos, convite)
- `src/components/` — Componentes React (navbar, expense-list, month-summary, receipt-upload)
- `src/lib/` — Libs (auth, db, storage, types, receipt-extractor)
- `src/hooks/` — Hooks (use-group, use-month-navigation)
- `prisma/` — Schema, migrations e seed

## Features

- Grupos com convite por código
- Membros vinculados (`countAsId`) — lançamentos contam como outro membro
- Upload de cupom com extração de itens via IA (OCR)
- Resumo mensal com divisão N pessoas e settlement
- Marcação de pagamento mensal
