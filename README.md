# Racha Conta

Shared expense splitting app for group members. Built for families or roommates who need to split monthly costs.

## Features

- Email/password login (optional Google OAuth)
- Invite-only signup (no open registration)
- Groups with invite codes
- Expense tracking with multiple items per entry
- Receipt upload with AI-powered item extraction (OCR)
- Monthly summary with equal split and settlement
- Linked members — another person can log expenses that count as yours
- Mobile-friendly interface

## Local Setup

### Prerequisites

- Node.js 20+
- Docker and Docker Compose

### Installation

```bash
# Clone and install dependencies
git clone git@github.com:prando27/despesas.git
cd despesas
npm install

# Copy env vars
cp .env.example .env
# Edit .env with your keys (BETTER_AUTH_SECRET, etc)

# Start PostgreSQL + MinIO
docker compose up -d

# Run migrations and seed
npx prisma migrate dev
npm run seed

# Start dev server
npm run dev
```

Access http://localhost:3000. Login: `prando27@gmail.com` / `12345678`

## Railway Deploy

Full plan in `plan/railway-deploy.md`.

### Required Services

1. **Web App** — service from GitHub repo (uses Dockerfile)
2. **PostgreSQL** — managed plugin
3. **Storage Bucket** — S3-compatible native Railway bucket

### Environment Variables (web service Variables tab)

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `https://your-app.up.railway.app` |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | `https://your-app.up.railway.app` |
| `BUCKET_NAME` | `${{Bucket.BUCKET}}` |
| `BUCKET_REGION` | `${{Bucket.REGION}}` |
| `BUCKET_ENDPOINT` | `${{Bucket.ENDPOINT}}` |
| `BUCKET_ACCESS_KEY_ID` | `${{Bucket.ACCESS_KEY_ID}}` |
| `BUCKET_SECRET_ACCESS_KEY` | `${{Bucket.SECRET_ACCESS_KEY}}` |
| `BUCKET_FORCE_PATH_STYLE` | `false` |
| `OCR_PROVIDER` | `openai` or `anthropic` |
| `OPENAI_API_KEY` | your key |

### Important Gotchas

- **`NEXT_PUBLIC_BETTER_AUTH_URL`** — inlined at Next.js build time. The Dockerfile uses `ARG` to receive it. Railway passes service variables as build args automatically. If the URL changes, you need to redeploy.
- **`.dockerignore`** — excludes local `.env` to avoid overwriting Railway env vars at build time.
- **`BUCKET_FORCE_PATH_STYLE`** — must be `false` on Railway (virtual-hosted-style). Locally with MinIO it's `true` (default).
- **Prisma CLI in Docker** — the runner stage installs `prisma` via npm (not copied from node_modules) to ensure all transitive dependencies.

### Production Seed

With the Railway database public URL:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
DATABASE_URL="postgresql://..." npx tsx prisma/seed.ts
```

Or via Railway CLI:

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
