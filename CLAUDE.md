# Despesas Mae

## Comandos

```bash
npm run dev              # Dev server
npm run build            # Build produção
npm run lint             # ESLint
npm run seed             # Seed do banco
docker compose up -d     # PostgreSQL + MinIO
npx prisma migrate dev   # Migrations
```

## Convenções

- UI e mensagens de erro em **português**
- Valores monetários usam Prisma `Decimal(10,2)` — sempre serializar com `serializeDecimal()` antes de retornar JSON
- API routes protegidas usam `withAuth()`, validação com Zod `safeParse()`
