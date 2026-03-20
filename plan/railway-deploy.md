# Plano: Deploy no Railway

## Arquitetura

3 serviços no Railway:
1. **Web App** — container Next.js (Dockerfile)
2. **PostgreSQL** — plugin gerenciado do Railway
3. **Storage Bucket** — bucket S3-compatible nativo do Railway

## Etapa 1: Ajustes no código (todos já aplicados)

### Dockerfile
- Copiar Prisma CLI (`prisma`, `@prisma/engines`, `.bin/prisma`) para o runner stage
- Usar `./node_modules/.bin/prisma` no CMD em vez de `npx`
- Adicionar `DATABASE_URL` dummy no build (prisma.config.ts precisa dele no build time)
- Remover COPY de `src/generated` (não existe)
- Criar diretório `public/` com `.gitkeep`

### prisma.config.ts
- Non-null assertion no `process.env["DATABASE_URL"]!` (TS exige)

### tsconfig.json
- Excluir `prisma.config.ts` do type checking do Next.js (evita erro de tipo no build)

### src/lib/storage.ts
- `forcePathStyle` configurável via env var `BUCKET_FORCE_PATH_STYLE`
- Default `true` (MinIO local), setar `false` para Railway

### src/app/api/despesas/receipt/route.ts
- Converter `Buffer` para `Uint8Array` no body do `NextResponse` (fix de tipo)

### .env.example
- Adicionado `BUCKET_FORCE_PATH_STYLE`

## Etapa 2: Criar projeto no Railway

1. Ir em [railway.app](https://railway.app) e criar novo projeto
2. Adicionar plugin **PostgreSQL**
3. Adicionar **Storage Bucket** (região desejada)
4. Adicionar **service from GitHub repo** — conectar o repositório

## Etapa 3: Variáveis de ambiente

Configurar no serviço web do Railway:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `BETTER_AUTH_SECRET` | gerar com `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `https://seu-app.up.railway.app` |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | `https://seu-app.up.railway.app` |
| `BUCKET_NAME` | `${{Bucket.BUCKET}}` |
| `BUCKET_REGION` | `${{Bucket.REGION}}` |
| `BUCKET_ENDPOINT` | `${{Bucket.ENDPOINT}}` |
| `BUCKET_ACCESS_KEY_ID` | `${{Bucket.ACCESS_KEY_ID}}` |
| `BUCKET_SECRET_ACCESS_KEY` | `${{Bucket.SECRET_ACCESS_KEY}}` |
| `BUCKET_FORCE_PATH_STYLE` | `false` |
| `OCR_PROVIDER` | `openai` ou `anthropic` |
| `OPENAI_API_KEY` | *(sua key)* |
| `GOOGLE_CLIENT_ID` | *(opcional)* |
| `GOOGLE_CLIENT_SECRET` | *(opcional)* |

**Nota:** `NEXT_PUBLIC_BETTER_AUTH_URL` é injetado no build — setar antes do primeiro deploy.

## Etapa 4: Migrations

O Dockerfile roda `prisma migrate deploy` antes de iniciar o server. No primeiro deploy, as migrations criam todas as tabelas. Em deploys subsequentes, só aplica migrations pendentes.

Se falhar, o container não sobe e o Railway mantém a versão anterior rodando.

## Etapa 5: Seed (uma vez)

Após o primeiro deploy, rodar seed para criar o usuário admin e grupo inicial.

### Opção A: `railway run` (recomendado)

Roda o seed localmente mas conectando no banco do Railway:

```bash
# Instalar CLI do Railway (se não tiver)
npm i -g @railway/cli

# Login e vincular ao projeto
railway login
railway link

# Rodar seed com env vars do Railway injetadas
railway run npx tsx prisma/seed.ts
```

### Opção B: `railway ssh`

Abre shell direto no container rodando no Railway:

```bash
railway ssh

# Dentro do container:
npx tsx prisma/seed.ts
```

**Nota:** `railway ssh` requer que o container tenha o `tsx` disponível. Como o runner é lean, a Opção A é mais confiável.

### Resultado do seed

Cria o usuário admin `prando27@gmail.com` com senha `12345678` e o grupo "Despesas da Mãe" com código de convite `TEST01`.

## Etapa 6: Domínio e Auth

1. Após primeiro deploy, Railway gera URL tipo `https://despesas-production-xxxx.up.railway.app`
2. Atualizar `BETTER_AUTH_URL` e `NEXT_PUBLIC_BETTER_AUTH_URL` com essa URL e redeployar
3. Opcionalmente, adicionar domínio custom e atualizar as URLs
4. Se usar Google OAuth, adicionar URL de produção nos redirect URIs autorizados no Google Cloud Console

## Etapa 7: Verificação

1. Checar logs do Railway — migrations rodaram?
2. Acessar a URL — tela de login aparece?
3. Registrar conta e criar grupo
4. Testar upload de cupom (verifica conectividade com bucket)
5. Criar despesa e verificar resumo

## Custos estimados (Railway)

- **Web App:** ~$5/mês (512MB RAM, uso baixo)
- **PostgreSQL:** ~$5/mês (plugin gerenciado)
- **Storage Bucket:** $0.015/GB-mês (operações e egress gratuitos)
- **Total:** ~$10-15/mês

## Mudanças no código

| Arquivo | Mudança | Status |
|---|---|---|
| `Dockerfile` | Prisma CLI no runner, DATABASE_URL dummy, sem src/generated | Feito |
| `prisma.config.ts` | Non-null assertion no URL | Feito |
| `tsconfig.json` | Excluir prisma.config.ts | Feito |
| `src/lib/storage.ts` | `forcePathStyle` configurável via env var | Feito |
| `src/app/api/despesas/receipt/route.ts` | Buffer → Uint8Array | Feito |
| `.env.example` | Adicionar `BUCKET_FORCE_PATH_STYLE` | Feito |
| `public/.gitkeep` | Criar diretório public | Feito |

## Docker build

Imagem testada e construída com sucesso: `racha-conta:latest` (379MB).
