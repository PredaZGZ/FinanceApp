# FinanceApp

Private personal-finance tracker for imported investments, portfolio calculations, net-worth assets, salary records, and financial reports.

## Current applications

- `apps/web`: React 19 and Vite web client.
- `apps/api`: Express API backed by PostgreSQL and Prisma.
- `apps/electron-desktop`: Electron desktop package.
- `apps/tauri-desktop`: Tauri 2 desktop package.

There is currently no mobile client, offline database, event log, loan module, invoice module, or budgeting module.

## Requirements

- Node.js 24 or another version supported by the dependencies.
- pnpm 10.26.0.
- PostgreSQL.
- `qpdf` to decrypt password-protected salary PDFs.
- Rust and the Tauri system dependencies when building Tauri.

On Debian/Ubuntu, Tauri additionally needs the WebKitGTK 4.1 development packages described in the Tauri prerequisites. Electron does not require the Rust or WebKitGTK toolchain.

## Local setup

Install the exact dependency graph:

```bash
pnpm install --frozen-lockfile
```

Create `apps/api/.env` from `apps/api/.env.example` and replace all three cryptographic placeholders with independent random 32-byte hexadecimal values. In non-production development, the API can create a local `.env` with unique random secrets on its first start.

Create or update the database:

```bash
pnpm --filter api db:migrate
```

Start the API and web client:

```bash
pnpm dev
```

The web client uses `http://localhost:3001` by default. Override it with `VITE_API_URL` when the API is hosted elsewhere.

## Commands

```bash
pnpm dev                 # API and web
pnpm dev:electron        # API, web, and Electron
pnpm dev:tauri           # API and Tauri
pnpm build               # API and web production builds
pnpm build:electron      # Electron and its web dependency
pnpm build:tauri         # Tauri and its web dependency
pnpm lint
pnpm test
pnpm check               # lint, tests, and API/web builds
pnpm audit --prod
```

## Data and security notes

- User-owned imports are deduplicated within each user account.
- Monetary database columns use fixed-precision decimal storage.
- Portfolio totals become unavailable when a required historical exchange rate is missing; the API does not assume a 1:1 conversion.
- Net-worth values are reported separately by currency.
- Salary uploads accept PDF, JPEG, and PNG files up to 10 MB.
- JWT, password pepper, and encryption keys are mandatory in production.

## Database migrations

Prisma migrations live in `apps/api/prisma/migrations`. Existing installations created from the legacy `db/init.sql` must baseline the initial migration before running `prisma migrate deploy`; new installations can deploy migrations directly.

## License

Proprietary and private. See `LICENSE`.
