# DUNAMIS — Plataforma de Inscrição e Gestão do Acampamento

Plataforma web para o acampamento **DUNAMIS**, do Ministério Manancial (Terceira
Igreja Baptista de Luanda): inscrição online com QR Code, validação de
pagamento, check-in por leitura de câmara e um painel administrativo com
estatísticas em tempo real.

## Funcionalidades

- **Inscrição pública** (`/inscricao`) — formulário em várias etapas, com
  máscaras de telefone/WhatsApp, upload de comprovativo de pagamento
  (Multicaixa Express ou transferência/IBAN), e suporte a inscrições
  patrocinadas/bolseiras (sem comprovativo, mas sujeitas à mesma aprovação do
  admin).
- **Validação de pagamento** — o admin confirma ou rejeita cada comprovativo;
  só depois disso o participante recebe, por email, o comprovativo de
  inscrição em PDF com o QR Code de acesso.
- **Reconsulta de inscrição** (`/consultar`) — por número de inscrição +
  telefone, sem necessidade de conta.
- **Painel administrativo** (`/admin`) — dashboard com estatísticas
  (género, faixa etária, transporte, tendas/colchões, check-ins), listagem de
  inscritos com filtros e exportação para Excel.
- **Check-in** (`/check-in`) — leitura de QR Code pela câmara do telemóvel,
  com prevenção de check-in duplicado.
- **Emails transacionais** — confirmação (com PDF em anexo) e rejeição de
  pagamento, enviados via API HTTPS da Brevo.
- Email e telefone/WhatsApp são únicos por participante — não é possível
  inscrever a mesma pessoa duas vezes com os mesmos contactos.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui |
| Backend | NestJS, Prisma, PostgreSQL |
| Autenticação | JWT (roles `ADMIN` / `OPERATOR`) |
| Base de dados | PostgreSQL (local: Docker · produção: [Neon](https://neon.tech)) |
| Comprovativos de pagamento | Disco local (dev) ou [Supabase Storage](https://supabase.com) (produção) |
| Email transacional | [Brevo](https://www.brevo.com) (API HTTPS — SMTP direto é bloqueado por vários hosts gratuitos, incluindo o Render) |
| QR Code | `qrcode` (geração) · `html5-qrcode` (leitura) |
| PDF | `pdfkit` (servidor) · `jspdf` (cliente) |
| Deploy | Vercel (frontend) · Render (backend, free tier) |

## Estrutura do repositório

```
dunamis/
├── apps/
│   ├── web/            # Next.js — site público + painel admin
│   └── api/             # NestJS — API REST
├── packages/
│   └── types/           # Enums e interfaces TypeScript partilhados
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts           # Paragens de transporte + utilizador admin (idempotente)
├── docker-compose.yml     # Postgres local
└── .env.example
```

## Começar (desenvolvimento local)

Pré-requisitos: Node.js 22+, Docker Desktop.

```bash
# 1. Instalar dependências
npm install

# 2. Copiar variáveis de ambiente (ver secção abaixo)
cp .env.example .env
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local   # só precisa de NEXT_PUBLIC_API_URL

# 3. Subir o Postgres local
docker compose up -d

# 4. Aplicar migrações + gerar o Prisma Client
npm run db:migrate

# 5. Semear paragens de transporte + utilizador admin
npm run db:seed

# 6. Correr backend e frontend (em terminais separados)
npm run dev:api    # http://localhost:3001
npm run dev:web    # http://localhost:3000
```

## Variáveis de ambiente

Veja `.env.example` para a lista completa e comentada. Resumo:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | Connection string do Postgres |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Sim | Assinatura dos tokens de sessão admin |
| `WEB_ORIGIN` | Sim | Origem do frontend, para CORS (sem barra final) |
| `SEED_ADMIN_NAME/EMAIL/PASSWORD` | Sim | Conta administrativa criada pelo seed |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` | Não | Armazenamento persistente dos comprovativos em produção — sem isto, ficam em disco local (perdidos a cada redeploy) |
| `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` | Não | Envio dos emails de confirmação/rejeição de pagamento — sem isto, os emails são só registados nos logs, não enviados |
| `NEXT_PUBLIC_API_URL` | Sim (web) | URL da API, usado pelo frontend |

## Scripts úteis

```bash
npm run dev:web          # Frontend em modo dev
npm run dev:api          # Backend em modo dev
npm run build             # Build de produção (web + api)
npm run lint               # Lint de ambos os workspaces

npm run db:generate       # Gerar o Prisma Client
npm run db:migrate         # Criar/aplicar migração (dev)
npm run db:deploy          # Aplicar migrações pendentes (produção)
npm run db:seed            # Paragens de transporte + utilizador admin
npm run db:studio          # Interface gráfica da base de dados (Prisma Studio)
```

Para o `db:studio` apontar à base de dados de produção em vez da local, defina
`DATABASE_URL` só para esse comando (sem alterar o `.env`):

```bash
DATABASE_URL="<connection string de produção>" npm run db:studio
```

## Deploy

- **Frontend**: Vercel, a partir de `apps/web`.
- **Backend**: Render (Web Service), build a partir da raiz do repositório:
  ```
  npm install && npm run build --workspace=packages/types && npx prisma generate --schema=prisma/schema.prisma && npm run build --workspace=apps/api
  ```
  Start command:
  ```
  npx prisma migrate deploy --schema=prisma/schema.prisma && npm run db:seed && cd apps/api && node dist/main.js
  ```
  O seed corre em todos os arranques mas é idempotente (usa `upsert`), por
  isso é seguro correr sempre, mesmo sem acesso a Shell no plano gratuito.
- **Base de dados**: [Neon](https://neon.tech) (Postgres serverless, plano
  gratuito).
- **Comprovativos de pagamento**: [Supabase Storage](https://supabase.com)
  (bucket público `payment-proofs`).
- **Email**: [Brevo](https://www.brevo.com) — API HTTPS, não SMTP (o Render
  bloqueia saída pela porta SMTP no plano gratuito).
