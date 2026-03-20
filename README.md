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

## Deploy

O app está preparado para deploy no Railway. Veja o plano completo em `plan/railway-deploy.md`.

### Serviços necessários

- **Web App** — Dockerfile multi-stage pronto
- **PostgreSQL** — plugin gerenciado do Railway
- **Storage Bucket** — S3-compatible (Railway ou Cloudflare R2)

## Tech Stack

- Next.js 14 (App Router)
- Prisma + PostgreSQL
- Better Auth
- S3-compatible storage (MinIO / Railway bucket)
- Tailwind CSS + shadcn/ui
- TypeScript
