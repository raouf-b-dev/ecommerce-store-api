# Local Development Setup

Short guide for first-time local setup: environment files, what is auto-generated, and the correct boot order before seeding.

---

## 1. Generate environment files

From the repository root:

```bash
npm run env:init
```

This reads [`.env.example`](../../.env.example) and creates:

| File               | Purpose                                                                          |
| :----------------- | :------------------------------------------------------------------------------- |
| `.env.development` | Local API + Compose scripts                                                      |
| `.env.production`  | Production Compose profile                                                       |
| `.env.staging`     | Staging profile                                                                  |
| `.env.test`        | Test / migration scripts                                                         |
| `.secrets`         | CI values for GitHub Actions (from [`.secrets.example`](../../.secrets.example)) |

Existing files are skipped unless you pass `--overwrite`:

```bash
npm run env:init:force
# or
npm run env:init -- --overwrite
```

Targeted generation:

```bash
npm run env:init:dev
npm run env:init:secrets
```

Implementation: [`scripts/generate-envs.js`](../../scripts/generate-envs.js).

---

## 2. Auto-generated vs verify manually

### Auto-generated (no manual paste for local dev)

| Variable                 | Notes                                            |
| :----------------------- | :----------------------------------------------- |
| `JWT_PRIVATE_KEY`        | RSA-4096 PEM, escaped for dotenv                 |
| `METRICS_API_KEY`        | Random hex for `/metrics` auth                   |
| `GRAFANA_ADMIN_PASSWORD` | Random hex when present in template              |
| `NODE_ENV`               | Set per file (`development`, `production`, etc.) |
| `APP_VERSION`            | From `package.json`                              |
| `REDIS_KEYPREFIX`        | `ecom:<env>:`                                    |
| `LOG_LEVEL`              | `debug` in development                           |

### Verify against Compose defaults

For local development, confirm **`.env.development`** matches what Compose expects.

| Variable         | Typical local value |
| :--------------- | :------------------ |
| `DB_HOST`        | `localhost`         |
| `DB_PORT`        | `5432`              |
| `DB_USERNAME`    | `postgres`          |
| `DB_PASSWORD`    | `your_password`     |
| `DB_DATABASE`    | `my_database`       |
| `REDIS_HOST`     | `localhost`         |
| `REDIS_PORT`     | `6379`              |
| `REDIS_PASSWORD` | `secret`            |

Docker Compose reads the same `.env.development` via the local Docker scripts.

### Observability port coupling

If you remap ports locally:

- `OTEL_EXPORTER_OTLP_ENDPOINT` must match `OTLP_GRPC_HOST_PORT` because `npm run start:dev` runs the API on the host.
- If `PORT` changes for the host-run API, update [`docker/monitoring/prometheus/prometheus.yml`](../../docker/monitoring/prometheus/prometheus.yml) so `host.docker.internal:<port>` matches the new host port.

---

## 3. Recommended boot order

```bash
# 1. Environment (once, or after template changes)
npm run env:init

# 2. Core infrastructure
npm run d:up:dev

# 3. Schema
npm run migration:run:dev

# 4. API (first boot initializes roles and permissions)
npm run start:dev

# 5. Sample data (second terminal, after the first boot finishes)
npm run db:seed
```

### Optional: observability profile

```bash
npm run d:up:obs:dev
```

This adds Prometheus, Loki, Promtail, Tempo, and Grafana on top of the core stack.

To stop observability without stopping Postgres or Redis:

```bash
npm run d:stop:obs:dev
```

### Why boot before seed?

Roles and permissions are created on application bootstrap (`OnApplicationBootstrap` hooks). The seeder expects those system roles to exist. See [`SEEDING.md`](SEEDING.md) for accounts, catalog, and idempotency behavior.

---

## 4. Quick checks

Use the configured values from `.env.development` when you remap locally.

| Check                | Command / URL                              |
| :------------------- | :----------------------------------------- |
| API                  | `http://localhost:<PORT>`                  |
| Swagger              | `http://localhost:<PORT>/api`              |
| Liveness             | `GET /health/liveness`                     |
| Readiness (Postgres) | `GET /health/readiness`                    |
| Prometheus           | `http://localhost:<PROMETHEUS_HOST_PORT>`  |
| Grafana              | `http://localhost:<GRAFANA_HOST_PORT>`     |
| Loki                 | `http://localhost:<LOKI_HOST_PORT>/ready`  |
| Tempo                | `http://localhost:<TEMPO_HOST_PORT>/ready` |

Canonical defaults are API `3000`, Prometheus `9090`, Grafana `3001`, Loki `3100`, and Tempo `3200`.

---

## 5. Related docs

| Topic                      | Document                                                                  |
| :------------------------- | :------------------------------------------------------------------------ |
| Seed accounts and catalog  | [`SEEDING.md`](SEEDING.md)                                                |
| Common local failures      | [`TROUBLESHOOTING.md`](../infrastructure/TROUBLESHOOTING.md)              |
| Monitoring stack           | [`MONITORING-STACK-GUIDE.md`](../observability/MONITORING-STACK-GUIDE.md) |
| Production secret rotation | [`SECRET-ROTATION.md`](../security/SECRET-ROTATION.md)                    |
| CI secrets from `.secrets` | [`PROJECT-PIPELINE.md`](../infrastructure/cicd/PROJECT-PIPELINE.md)       |
