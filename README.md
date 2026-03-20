# Racha Conta

App para dividir despesas compartilhadas entre membros de um grupo. Ideal para famílias ou roommates que precisam rachar custos mensais.

## Features

- Login com email/senha (Google OAuth opcional)
- Grupos com convite por código
- Lançamento de despesas com múltiplos itens
- Upload de cupom com extração automática via IA (OCR)
- Resumo mensal com divisão igualitária e settlement
- Membros vinculados — outra pessoa pode lançar despesas que contam como suas
- Interface mobile-friendly

## Setup local

### Pré-requisitos

- Node.js 20+
- Docker e Docker Compose

### Instalação

```bash
# Clonar e instalar dependências
git clone git@github.com:prando27/despesas.git
cd despesas
npm install

# Copiar env vars
cp .env.example .env
# Editar .env com suas chaves (BETTER_AUTH_SECRET, etc)

# Subir PostgreSQL + MinIO
docker compose up -d

# Rodar migrations e seed
npx prisma migrate dev
npm run seed

# Iniciar dev server
npm run dev
```

Acesse http://localhost:3000. Login: `prando27@gmail.com` / `12345678`

## Deploy no Railway

Plano completo em `plan/railway-deploy.md`.

### Serviços necessários

1. **Web App** — service from GitHub repo (usa o Dockerfile)
2. **PostgreSQL** — plugin gerenciado
3. **Storage Bucket** — bucket S3-compatible nativo do Railway

### Variáveis de ambiente (aba Variables do serviço web)

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `https://seu-app.up.railway.app` |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | `https://seu-app.up.railway.app` |
| `BUCKET_NAME` | `${{Bucket.BUCKET}}` |
| `BUCKET_REGION` | `${{Bucket.REGION}}` |
| `BUCKET_ENDPOINT` | `${{Bucket.ENDPOINT}}` |
| `BUCKET_ACCESS_KEY_ID` | `${{Bucket.ACCESS_KEY_ID}}` |
| `BUCKET_SECRET_ACCESS_KEY` | `${{Bucket.SECRET_ACCESS_KEY}}` |
| `BUCKET_FORCE_PATH_STYLE` | `false` |
| `OCR_PROVIDER` | `openai` ou `anthropic` |
| `OPENAI_API_KEY` | sua key |

### Gotchas importantes

- **`NEXT_PUBLIC_BETTER_AUTH_URL`** — é inlined no build do Next.js. O Dockerfile usa `ARG` para recebê-la no build time. O Railway passa automaticamente as variáveis do serviço como build args. Se a URL mudar, é preciso redeployar.
- **`.dockerignore`** — exclui o `.env` local para não sobrescrever as env vars do Railway no build.
- **`BUCKET_FORCE_PATH_STYLE`** — deve ser `false` no Railway (virtual-hosted-style). Localmente com MinIO fica `true` (default).
- **Prisma CLI no Docker** — o runner stage instala `prisma` via npm (não copia de node_modules) para garantir todas as dependências transitivas.

### Seed em produção

Com a URL pública do banco do Railway:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
DATABASE_URL="postgresql://..." npx tsx prisma/seed.ts
```

Ou via Railway CLI:

```bash
railway login
railway link
railway run npx tsx prisma/seed.ts
```

## Tech Stack

- Next.js 14 (App Router)
- Prisma + PostgreSQL
- Better Auth
- S3-compatible storage (MinIO / Railway bucket)
- Tailwind CSS + shadcn/ui
- TypeScript
