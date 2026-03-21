# Racha Conta

Shared expense splitting app for group members.

## Commands

```bash
docker compose up -d     # PostgreSQL + MinIO (dev)
npm run dev              # Dev server
npm run build            # Production build
npm run lint             # ESLint
npm run seed             # Seed database
npx prisma migrate dev   # Run migrations
```

## Stack

- **Next.js 14** (App Router, standalone output)
- **Prisma** + PostgreSQL
- **Better Auth** (email/password + optional Google OAuth)
- **S3-compatible storage** (MinIO local, Railway bucket in prod)
- **Tailwind CSS + shadcn/ui**

## Conventions

### Language
- All code, variable names, function names, routes, and comments in **English**
- All user-facing strings (labels, messages, errors, placeholders) in **Portuguese**

### Code
- Monetary values use Prisma `Decimal(10,2)` — always serialize with `serializeDecimal()` before returning JSON
- Protected API routes use `getSession()` from Better Auth, validation with Zod `safeParse()`
- Sessions managed by Better Auth via httpOnly cookie
- Signup is invite-only (no open registration)

### Routes
- Public routes in middleware: `/login`, `/signup`, `/invite`, `/api/auth/*`, `/api/groups/info`

### Build & Deploy
- `NEXT_PUBLIC_` env vars are inlined at build time — use `ARG` in Dockerfile
- `.dockerignore` excludes `.env` to avoid overwriting Railway env vars

### Mobile / Safari iOS
- Inputs must have `font-size: 16px` to prevent zoom on Safari iOS
- `input[type="date"]` needs `appearance: none` + `max-width: 100%` on Safari iOS

## Structure

- `src/app/api/` — API routes (expenses, groups, summary, payments, OCR, auth)
- `src/app/` — Pages (login, signup, expenses, summary, groups, invite)
- `src/components/` — React components (navbar, expense-list, month-summary, receipt-upload, extraction-overlay)
- `src/lib/` — Libs (auth, db, storage, types, receipt-extractor)
- `src/hooks/` — Hooks (use-group, use-month-navigation)
- `prisma/` — Schema, migrations, and seed
