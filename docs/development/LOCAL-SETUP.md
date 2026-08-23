# Local Development Setup

Short guide for first-time local setup: environment files, what is auto-generated, and the correct boot order before seeding.

---

## 1. Generate environment files

From the repository root:

```bash
npm run env:init
```

This reads [`.env.example`](../../.env.example) and creates:

| File | Purpose |
| :---- | :------ |
| `.env.development` | Local API + `npm run d:up:dev` |
| `.env.production` | Production Compose profile |
| `.env.staging` | Staging profile |
| `.env.test` | Test / migration scripts |
| `.secrets` | CI values for GitHub Actions (from [`.secrets.example`](../../.secrets.example)) |

Existing files are skipped unless you pass `--overwrite`:

```bash
npm run env:init:force
# or
npm run env:init -- --overwrite
```

Targeted generation:

```bash
npm run env:init:dev        # .env.development only
npm run env:init:secrets    # .secrets only (CI)
```

Implementation: [`scripts/generate-envs.js`](../../scripts/generate-envs.js).

---

## 2. Auto-generated vs verify manually

### Auto-generated (no manual paste for local dev)

| Variable | Notes |
| :------- | :---- |
| `JWT_PRIVATE_KEY` | RSA-4096 PEM, escaped for dotenv |
| `METRICS_API_KEY` | Random hex for `/metrics` auth |
| `GRAFANA_ADMIN_PASSWORD` | Random hex when present in template |
| `NODE_ENV` | Set per file (`development`, `production`, etc.) |
| `APP_VERSION` | From `package.json` |
| `REDIS_KEYPREFIX` | `ecom:<env>:` |
| `LOG_LEVEL` | `debug` in development |

### Verify against Docker Compose defaults

For local development, confirm **`.env.development`** matches what Compose expects. Defaults from `.env.example` work out of the box if you have not changed them:

| Variable | Typical local value |
| :------- | :------------------ |
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5432` |
| `DB_USERNAME` | `postgres` |
| `DB_PASSWORD` | `your_password` (must match Compose `POSTGRES_PASSWORD`) |
| `DB_DATABASE` | `my_database` |
| `REDIS_HOST` | `localhost` |
| `REDIS_PORT` | `6379` |
| `REDIS_PASSWORD` | `secret` (must match Redis `--requirepass`) |

Docker Compose reads the same `.env.development` via `npm run d:up:dev` (`--env-file .env.development`).

You do **not** need to paste JWT keys manually for local work: `env:init` generates them.

---

## 3. Recommended boot order

```bash
# 1. Environment (once, or after template changes)
npm run env:init

# 2. Infrastructure
npm run d:up:dev

# 3. Schema
npm run migration:run:dev

# 4. API (first boot initializes roles and permissions)
npm run start:dev

# 5. Sample data (in a second terminal, while API is running or after first boot completed)
npm run db:seed
```

### Why boot before seed?

Roles and permissions are created on application bootstrap (`OnApplicationBootstrap` hooks). The seeder expects those system roles to exist. See [`SEEDING.md`](SEEDING.md) for accounts, catalog, and idempotency behavior.

---

## 4. Quick checks

| Check | Command / URL |
| :---- | :------------ |
| API | `http://localhost:3000` |
| Swagger | `http://localhost:3000/api` |
| Liveness | `GET /health/liveness` |
| Readiness (Postgres) | `GET /health/readiness` |

---

## 5. Optional: full monitoring stack

```bash
npm run d:up:full:prod
```

Grafana: `http://localhost:3001`. API remains on port 3000. See [`MONITORING-STACK-GUIDE.md`](../observability/MONITORING-STACK-GUIDE.md).

---

## 6. Related docs

| Topic | Document |
| :---- | :------- |
| Seed accounts and catalog | [`SEEDING.md`](SEEDING.md) |
| Common local failures | [`TROUBLESHOOTING.md`](../infrastructure/TROUBLESHOOTING.md) |
| Production secret rotation | [`SECRET-ROTATION.md`](../security/SECRET-ROTATION.md) (ops, not local setup) |
| CI secrets from `.secrets` | [`PROJECT-PIPELINE.md`](../infrastructure/cicd/PROJECT-PIPELINE.md) |
