# Plano: Better Auth + Google Login + Grupos

## Contexto
Hoje o app tem login por email/senha com JWT manual e 2 usuários fixos na seed. Queremos:
1. Migrar auth para **Better Auth** (email/senha + Google OAuth)
2. Sistema de grupos para definir quem participa da divisão
3. Suporte a N pessoas no mesmo grupo

## Autenticação com Better Auth

### Por que Better Auth
- Lib leve, TypeScript-first, com suporte nativo a Prisma
- Suporta email/senha + social providers (Google) lado a lado
- Sessões gerenciadas automaticamente (cookie httpOnly)
- CLI para gerar migrations do schema de auth

### Estratégia de login
- **Email/senha** como método principal — facilita testes locais e dev
- **Google OAuth** como método adicional vinculado à mesma conta (account linking)
- Um usuário que se cadastrou com email/senha pode depois vincular Google, e vice-versa
- `account.accountLinking.enabled: true` no config

### Setup

```ts
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";

export const auth = betterAuth({
  // Não precisa de baseURL/secret aqui — Better Auth lê de
  // BETTER_AUTH_URL e BETTER_AUTH_SECRET automaticamente
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  // Google OAuth condicional — só ativa se as env vars existirem
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    }),
  },
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 dias (em segundos)
    updateAge: 60 * 60 * 24,       // refresh a cada 24h
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // cache de 5 min — evita hit no DB a cada request
    },
  },
});

// Type-safe session inference para usar no server
export type Session = typeof auth.$Infer.Session;
```

```ts
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // NEXT_PUBLIC_ para funcionar no client-side
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
});

// Re-export hooks para conveniência
export const { signIn, signUp, signOut, useSession } = authClient;
```

```ts
// src/app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

**Importante:** `BETTER_AUTH_URL` e `BETTER_AUTH_SECRET` são lidas automaticamente das env vars — não definir `baseURL`/`secret` no config se as env vars estiverem setadas.

### Fluxo de login
1. Tela de login com formulário email/senha + botão "Entrar com Google"
2. Cadastro por email/senha cria User + Account(credential)
3. Login com Google cria User + Account(google), ou vincula se email já existe
4. Sessão gerenciada pelo Better Auth (cookie httpOnly, sem JWT manual)

### Middleware
- Better Auth gerencia sessões via cookie automaticamente
- No middleware do Next.js, passar headers explicitamente:
  ```ts
  const session = await auth.api.getSession({ headers: req.headers });
  ```
- No server (API routes, server components), usar `auth.api.getSession({ headers: await headers() })`
- No client, usar `useSession()` do auth-client (re-export do `better-auth/react`)

### Notas sobre sessão
- `cookieCache` ativado: evita hit no DB a cada request (cache de 5 min no cookie)
- Campos customizados no User **não** são incluídos no cache — são re-fetched do DB
- Para invalidar todas as sessões: incrementar `session.cookieCache.version` no config

## Modelo de Dados

### Schema Prisma (auth tables gerenciadas pelo Better Auth CLI)

O Better Auth gera suas próprias tabelas (`user`, `session`, `account`, `verification`). Rodamos `npx @better-auth/cli@latest generate` para gerar o schema Prisma e depois adicionamos nossos campos/models.

**Gotcha importante:** O adapter Prisma usa o **nome do model** (ex: `User`), não o nome da tabela (ex: `users` via `@@map`). Se o model Prisma é `User` mapeado para `users`, o Better Auth referencia como `"user"` (lowercase do model name).

### Models customizados (nossos)

```prisma
// Campos adicionais no User (via user.additionalFields no config)
// Better Auth cria: id, name, email, emailVerified, image, createdAt, updatedAt

model Group {
  id         String   @id @default(cuid())
  name       String
  inviteCode String   @unique @map("invite_code")
  createdAt  DateTime @default(now()) @map("created_at")

  members  GroupMember[]
  expenses Expense[]

  @@map("groups")
}

model GroupMember {
  id       String   @id @default(cuid())
  group    Group    @relation(fields: [groupId], references: [id])
  groupId  String   @map("group_id")
  user     User     @relation(fields: [userId], references: [id])
  userId   String   @map("user_id")
  role     String   @default("member") // "admin" | "member"
  joinedAt DateTime @default(now()) @map("joined_at")

  @@unique([groupId, userId])
  @@index([groupId])
  @@index([userId])
  @@map("group_members")
}

model Expense {
  // adicionar relação com grupo
  group    Group  @relation(fields: [groupId], references: [id])
  groupId  String @map("group_id")
  // ... campos existentes (sem password/role no User)
}

model MonthPayment {
  // adicionar relação com grupo
  group    Group  @relation(fields: [groupId], references: [id])
  groupId  String @map("group_id")
  // ... campos existentes
}
```

### O que sai
- Campo `password` do User (gerenciado pelo Better Auth via Account)
- Campo `role` do User (substituído por `role` no GroupMember)
- `src/lib/auth.ts` antigo (JWT manual, bcrypt)
- Dependências: `bcryptjs`, `jsonwebtoken`, `@types/bcryptjs`, `@types/jsonwebtoken`

### O que entra
- Dependência: `better-auth`
- Tables do Better Auth: `user`, `session`, `account`, `verification`
- Model `Group` com `inviteCode`
- Model `GroupMember` com role
- `groupId` em Expense e MonthPayment

## Sistema de Grupos

### Criar grupo
- POST /api/groups → cria grupo + adiciona criador como admin
- Gera `inviteCode` aleatório (6 chars, ex: "A3F8K2")

### Entrar no grupo
- GET /api/groups/join?code=A3F8K2 → tela de confirmação
- POST /api/groups/join → adiciona usuário como member
- Validações: código existe, usuário não é membro ainda

### Convite
- Tela de configurações mostra o código do grupo
- Botão "Copiar link de convite" → copia URL com o código
- Link: /convite/A3F8K2

### Fluxo de primeiro acesso
1. Usuário acessa o app → tela de login (email/senha ou Google)
2. Após login, se não tem nenhum grupo → redireciona para "Criar grupo" ou "Entrar com convite"
3. Se tem grupo → redireciona para /despesas

## Divisão de Despesas

### Lógica atual (2 pessoas)
```
total / 2 → cada um paga metade → quem pagou menos deve a diferença / 2
```

### Nova lógica (N pessoas)
```
total / N membros → cada um paga (total/N)
→ quem pagou menos que (total/N) deve a diferença
→ settlement entre quem deve e quem tem a receber
```

Para 2 pessoas o resultado é idêntico ao atual.

### Resumo mensal
- Agora filtrado por grupo (groupId)
- Mostra todos os membros do grupo
- Settlement calculado entre todos os membros

## Etapas de Implementação

### Etapa 1: Better Auth + Schema
- [ ] Instalar `better-auth`
- [ ] Criar `src/lib/auth.ts` com config Better Auth (email/senha + Google)
- [ ] Criar `src/lib/auth-client.ts` com client React
- [ ] Criar rota `src/app/api/auth/[...all]/route.ts`
- [ ] Rodar `npx @better-auth/cli@latest generate` para gerar schema Prisma
- [ ] Adicionar models Group, GroupMember ao schema
- [ ] Adicionar `groupId` em Expense e MonthPayment
- [ ] Criar migration
- [ ] Remover `bcryptjs`, `jsonwebtoken` e seus `@types`

### Etapa 2: Middleware + Sessão
- [ ] Atualizar middleware para usar sessão do Better Auth
- [ ] Atualizar APIs para pegar sessão via `auth.api.getSession()`
- [ ] Remover `withAuth` e `getSession` antigos

### Etapa 3: Telas de Auth
- [ ] Tela de login: formulário email/senha + botão Google
- [ ] Tela de cadastro: formulário com **name**, email e senha (name é obrigatório no Better Auth)
- [ ] Usar `signIn.email()`, `signUp.email()`, `signIn.social({ provider: "google" })` do auth-client
- [ ] Botão Google só aparece se provider estiver configurado (condicional)
- [ ] Verificar `GET /api/auth/ok` retorna `{ status: "ok" }`

### Etapa 4: Sistema de Grupos
- [ ] API: POST /api/groups (criar)
- [ ] API: POST /api/groups/join (entrar)
- [ ] API: GET /api/groups/current (grupo ativo)
- [ ] Tela: /grupos/novo (criar grupo)
- [ ] Tela: /convite/[code] (entrar no grupo)
- [ ] Tela: configurações do grupo (ver código, membros)

### Etapa 5: Adaptar Despesas e Resumo
- [ ] Filtrar despesas por groupId
- [ ] Filtrar resumo por groupId
- [ ] Filtrar pagamentos por groupId
- [ ] Adaptar settlement para N pessoas
- [ ] Adaptar MonthSummary para N pessoas

### Etapa 6: Seed + Limpeza
- [ ] Atualizar seed para usar Better Auth server API:
  ```ts
  await auth.api.signUpEmail({ body: { email, password, name } });
  ```
- [ ] Seed cria grupo de teste com 2 membros
- [ ] Atualizar .env.example com `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID` (opcional), `GOOGLE_CLIENT_SECRET` (opcional)
- [ ] Atualizar Dockerfile

## Variáveis de Ambiente

```
# Better Auth (obrigatórias)
BETTER_AUTH_SECRET=""   # min 32 chars — gerar com: openssl rand -base64 32
BETTER_AUTH_URL="http://localhost:3000"

# Client-side (Next.js precisa do prefixo NEXT_PUBLIC_ para expor ao browser)
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"

# Google OAuth (opcional em dev — app funciona só com email/senha sem isso)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Database (já existe)
DATABASE_URL=""
```

## Riscos e Decisões

1. **Migration destrutiva**: A adição de `groupId` (required) em Expense e MonthPayment precisa de uma migration cuidadosa. Opção: criar um grupo "default" e migrar dados existentes pra ele. O model User atual será substituído pelo do Better Auth (que guarda senha na tabela `account`, não no `user`).

2. **Better Auth + Prisma**: O CLI do Better Auth gera o schema das tabelas de auth. Precisamos mesclar com nosso schema existente. Rodar `generate` e depois ajustar manualmente.

3. **Account linking**: Com `accountLinking.enabled: true`, se um usuário se cadastra com email/senha e depois faz login com Google usando o mesmo email, as contas são vinculadas automaticamente.

4. **Usuário sem grupo**: Após login, se não tem grupo, não pode fazer nada até criar ou entrar em um. UX clara para isso.

5. **Múltiplos grupos**: Um usuário pode estar em mais de um grupo. A UI precisa de um seletor de grupo ativo.

6. **Google OAuth em dev**: Opcional. Email/senha funciona sem configurar Google. Para testar Google, criar projeto no Google Cloud Console com callback `http://localhost:3000/api/auth/callback/google`.

7. **Re-run CLI**: Após adicionar plugins ao Better Auth, rodar `npx @better-auth/cli@latest generate` novamente.
