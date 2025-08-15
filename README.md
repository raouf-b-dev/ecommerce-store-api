> ⚠️ **Read-only / No contributions accepted**  
> This repository is a **private GitHub mirror** of the canonical Bitbucket repository.  
> **All rights reserved © 2025 PrimeRaouf.** Do not copy, distribute, or use this code without explicit permission.

# ecommerce-mvp-api

> A production-ready NestJS MVP API for an e-commerce store — Postgres, Redis, TypeORM, DDD, clean architecture, and Docker Compose.

**Primary repository (Bitbucket)**: `https://rbdzmain@bitbucket.org/b_b_m_dev/ecommerce-store-api.git`  
**GitHub mirror**: `https://github.com/PrimeRaouf/ecommerce-store-api.git`

---

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Features](#-features)
- [Quick Start (Development)](#-quick-start-development)
- [Testing](#-testing)
- [Database (TypeORM)](#-database-typeorm)
- [Environment Config](#-environment-config)
- [Docker](#-docker)
- [NPM Scripts](#-npm-scripts-most-used)
- [Secrets](#-secrets)
- [Project Structure](#-project-structure-excerpt)
- [Troubleshooting](#-troubleshooting)
- [Acknowledgments](#-acknowledgments)

---

## 🖥 Prerequisites

Tested environment:

- **Node.js** ≥ 22 (tested with v22.14.0)
- **npm** ≥ 11 (tested with v11.4.2)
- **Docker Desktop** ≥ 28 (tested with v28.3.2)
- **Docker Compose v2** (`docker compose` command — tested with v2.39.1, included in Docker Desktop)
- **Git** ≥ 2.49 (tested with v2.49.0)
- (Optional) **PowerShell** ≥ 7.5.2 or WSL2/Git Bash for better Docker command compatibility on Windows

---

## ✨ Features

- NestJS + TypeScript
- PostgreSQL (TypeORM) & Redis
- Domain-Driven Design (presentation, application, domain, infrastructure layers)
- Result pattern, custom errors, and consistent error handling
- Unit tests across layers (Jest)
- Docker Compose for per-environment infrastructure

---

## 🚀 Quick Start (Development)

1. **Clone & install**

   ```bash
   git clone https://github.com/PrimeRaouf/ecommerce-store-api.git
   cd ecommerce-store-api
   npm i
   ```

2. **Generate env files**  
   Creates `.env.development`, `.env.production`, `.env.staging`, `.env.test` from `.env.example`:

   ```bash
   npm run env:init
   # or single env
   npm run env:init:dev
   ```

3. **Fill in secrets**  
   Update the generated `.env.*` files with DB, Redis, JWT, and other secrets.

4. **Start infrastructure** (Postgres, Redis):

   ```bash
   npm run d:up:dev
   ```

5. **Run the API**
   ```bash
   npm run start:dev
   ```

---

## 🧪 Testing

- Unit tests: `npm test`
- Watch mode: `npm run test:watch`
- Coverage: `npm run test:cov`
- E2E: `npm run test:e2e`

> Tests use `.env.test` and can run isolated infrastructure via Docker Compose when needed.

---

## 🐘 Database (TypeORM)

- Generate: `npm run migration:generate -- <Name>`
- Run: `npm run migration:run`
- Revert: `npm run migration:revert`

> Make sure Postgres is up (`npm run d:up:dev`) and env vars are set.

---

## 🔧 Environment Config

- Env files are **gitignored**; `.env.example` is the canonical key list.
- Create per-env files: `.env.development`, `.env.staging`, `.env.production`, `.env.test`.
- Use `scripts/generate-envs.js` to scaffold from `.env.example`.

---

## 🐳 Docker

- **Up (dev)**: `npm run d:up:dev`
- **Down (dev)**: `npm run d:down:dev`
- Replace `dev` with `staging`, `prod`, or `test` as needed.

> `docker-compose.yaml` reads values from `.env.<env>` via `--env-file`.

---

## 📜 NPM Scripts (Most Used)

- `start:dev` — Nest in watch mode
- `d:up:<env>` / `d:down:<env>` — Docker Compose up/down with env file
- `test`, `test:watch`, `test:cov`, `test:e2e`
- `migration:*` — TypeORM migrations
- `env:init` — Generate `.env.*` files from `.env.example`

Full list available in `package.json`.

---

## 🔐 Secrets

- Never commit real secrets.
- For production, prefer AWS Secrets Manager, Vault, or OS-level file permission restrictions.

---

## 🧰 Project Structure (excerpt)

```
src/
  modules/
  main.ts
  ...
docker-compose.yaml
.env.example
.env.development (gitignored)
.env.staging     (gitignored)
.env.production  (gitignored)
.env.test        (gitignored)
```

---

## 🧭 Troubleshooting

- **Docker fails with missing envs**: ensure `.env.<env>` exists and you’re using the right script (e.g., `d:up:dev`).
- **Migrations can’t connect**: check DB env vars and Postgres container status.
- **Jest open handles**: run `npm run test:ci` (in band mode, detects open handles).

---

## 🤝 Acknowledgments

Built by **PrimeRaouf**  
GitHub: [https://github.com/PrimeRaouf/ecommerce-store-api](https://github.com/PrimeRaouf/ecommerce-store-api)

```

```
