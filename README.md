# My Personal Finance App

A cross-platform personal finance system designed for rigorous, long-term financial tracking and analysis. It provides structured management of investments, loans, invoices, payroll, and derived analytics through a shared codebase deployed on desktop (macOS, Windows, Linux), mobile (iOS), and web. The backend acts as the authoritative source of truth, while clients are optimized for responsiveness via local caching and incremental updates.

## Overview

The application centralizes all personal financial data in a PostgreSQL-backed server, exposing a clean API to multiple clients built from a single monorepo. Desktop applications run through a Tauri v2 Rust shell for security, performance, and native OS integration. The architecture prioritizes deterministic data flow, reproducibility, and a uniform domain model shared across all platforms.

## Core Features

### Financial Domains

The system covers all principal personal-finance categories:

- **Investments**: securities, ETFs, funds, forex, and portfolio evolution
- **Loans** and amortization schedules
- **Invoices**, billing, and issued/received documents
- **Payroll**, recurrent income, and income classification
- **Budgeting** and expense categories
- **Analytical dashboards**: trends, aggregations, and time-series visualizations

These components follow unified domain rules to allow consistent processing across clients.

### Cross-Platform Clients

- **Web client** built with React + Vite
- **Desktop client** written in Rust + Tauri v2 using the same web UI bundle
- **iOS client** listed as supported in the product baseline


## Architecture

### Monorepo Structure

Managed with pnpm workspaces:

- `apps/web`: React + Vite frontend
- `apps/api`: Node.js + Express + TypeScript backend
- `apps/tauri-desktop`: Tauri v2 desktop shell wrapping the web bundle

This structure maintains deterministic builds and separates concerns between the API, the web client, and the desktop shell.

### Backend

- Server as the authoritative data store
- PostgreSQL as main persistence engine
- Encrypted server storage as baseline security model
- Event-driven approach for extensibility of modules
- REST API for client interaction
- Layered architecture separating domain, application services, and transport

### Desktop Runtime

Tauri v2 runs the web application inside a secure Rust host. Rust handles:

- File system access
- Secure secrets storage
- Native window management
- Performance-critical operations
- Isolation from browser runtime inconsistencies

### Local Client Architecture

The clients are designed to remain fast and deterministic even when remote operations are slow.
The model is explicit to demonstrate architectural clarity:

#### Local Persistence (Demonstration Architecture)

Clients can operate using:

- Encrypted SQLite database (optional future implementation)
- WAL mode for high-frequency updates
- Materialized local views for instant reads

#### Event-Driven Write Pipeline

- UI writes generate domain events
- Events appended to a local log
- A background worker uploads pending events
- A cursor-based pull mechanism applies server updates
- Materialized views rebuilt incrementally for deterministic state

#### Intended Behaviour

- Instant UI responses
- No dependence on network round-trip
- Predictable conflict resolution
- Convergence driven by event ordering

This section is intentionally explicit to reflect engineering discipline in state management.

## Planned External Integrations

The project includes planned connectors for future releases:

- Broker APIs
- Banking data exports
- FX rate providers
- Document ingestion pipelines

No assumptions made beyond the baseline.

## Development Setup

### Requirements

- Node.js
- pnpm
- Rust toolchain
- PostgreSQL

### Install Dependencies

```bash
pnpm install
```

### Development

Run backend + desktop:

```bash
pnpm dev
```

Web client:

```bash
pnpm dev:web
```

API:

```bash
pnpm dev:api
```

Desktop:

```bash
pnpm dev:desktop
```

### Build

```bash
pnpm build
```

## Status

Early Development. The foundational architecture, tooling, workspace design, and core domain scaffolding are being established. Functionality evolves iteratively with strict attention to determinism, performance, and correctness.

## License

Proprietary / Private.
