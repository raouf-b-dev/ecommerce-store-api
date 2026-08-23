# Release, Rollback, and Backup Procedures

Operational runbook for single-instance production of the E-Commerce Store API: backups, releases, rollback, smoke probes, and restore drills.

Companion docs: [REDIS.md](REDIS.md) (readiness vs Redis), [PROJECT-PIPELINE.md](cicd/PROJECT-PIPELINE.md) (CI smoke), [DEPLOYMENT-STRATEGIES.md](cicd/deployment/DEPLOYMENT-STRATEGIES.md) (blue-green/canary theory), [SECRET-ROTATION.md](../security/SECRET-ROTATION.md) (credential rotation; re-run smoke after rotating).

---

## 1. Backup strategy (single-instance)

| Metric  | Target for first private production                                             |
| :------ | :------------------------------------------------------------------------------ |
| **RPO** | At most one pre-release dump + any writes since last `npm run db:backup`        |
| **RTO** | Stop app → restore dump → previous image → smoke (typically minutes on Compose) |

Use **logical** PostgreSQL backups (`pg_dump -Fc` custom format): portable, compressed, restorable with `pg_restore`. Physical base backups + WAL PITR and encrypted off-site storage are deferred (Roadmap Phase 18).

Scripts:

| Script                                                             | npm                | Role                                                                                              |
| :----------------------------------------------------------------- | :----------------- | :------------------------------------------------------------------------------------------------ |
| [`scripts/db-backup.js`](../../scripts/db-backup.js)               | `db:backup`        | Dump to `backups/ecommerce-store-api_<ts>.dump`, validate with `pg_restore --list`, retain last N |
| [`scripts/db-restore.js`](../../scripts/db-restore.js)             | `db:restore`       | Restore `--from=` or latest dump (`--yes` to skip prompt)                                         |
| [`scripts/db-restore-drill.js`](../../scripts/db-restore-drill.js) | `db:restore:drill` | Disposable-DB verification (definition of done)                                                   |

Env contract (`DB_*`, not CRM `POSTGRES_*` for credentials):

- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- `POSTGRES_CONTAINER_NAME`, `POSTGRES_IMAGE` (from `.env.example`; CI resolves these via a `resolve-env` job into service images)

Scripts pick client tools in this order:

1. `docker exec` into `POSTGRES_CONTAINER_NAME` when that container is running
2. `docker run --network host` with `POSTGRES_IMAGE`
3. Host-installed `pg_dump` / `pg_restore` / `psql` (last resort)

`pg_restore` uses `--exit-on-error` and requires exit code 0 (no soft-fail on exit 1).

Passwords are passed via process env (`PGPASSWORD`), never interpolated into shell command strings. CI readiness checks may use a thin Ubuntu `postgresql-client` for `pg_isready` only.

---

## 2. Backup security

1. **Never commit dumps**: `backups/` is gitignored. Dumps contain PII and password hashes.
2. **Host-mounted output**: write to the host `backups/` directory (default), not an ephemeral container filesystem.
3. **Least privilege**: prefer a read-only backup role for scheduled dumps when you harden beyond the ship gate; scripts today use `DB_*` credentials.
4. **Encryption / off-site**: not automated here; Phase 18.

---

## 3. Restore verification (definition of done)

A dump that has never been restored is not a backup.

```
Backup source DB → recreate disposable DB → pg_restore → TOC / table check → (optional) smoke against that DB
```

### 3.1 Local drill

```bash
npm run db:restore:drill
# Direct invocation (required when calling the script file without npm):
#   node scripts/db-restore-drill.js --yes
# Optional: --database=ecommerce_restore_drill --keep-dump
```

> **npm CLI note (Windows / npm 12+)**: flags after a single `--` may be rejected as unknown npm config. Prefer `node scripts/<file>.js --flag=value`, or `npm run <script> -- -- --flag=value`. The `db:restore:drill` script already includes `--yes`.

The drill:

1. Inserts a disposable marker row into source `products`
2. Dumps → recreates `ecommerce_restore_drill` → restores
3. Asserts public table count > 0
4. Asserts required tables exist: `users`, `products`, `orders`, `payments`, `reservations`
5. Asserts the marker row is present in the restored DB
6. Deletes the marker from the **source** DB (always, in `finally`)

### 3.2 CI automation

| Job                       | When                                                                                                                      | What                                                                          |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------- |
| **restore-drill**         | Every PR / push (same-repo) in `ci.yml`                                                                                   | `prepare-db-env` → `migration:run:test` → `npm run db:restore:drill`          |
| **restore-drill-smoke**   | `master` push in `ci.yml`                                                                                                 | prepare-test-env → migrate → drill `--keep-dump` → app on restored DB → smoke |
| **Nightly Restore Drill** | `0 3 * * *` UTC + `workflow_dispatch` in [`nightly-restore-drill.yml`](../../.github/workflows/nightly-restore-drill.yml) | Thin workflow: build + restore-drill + restore-drill-smoke only (not full CI) |

Schema comes from the baseline TypeORM migration ([`src/migrations/*InitialBaseline*`](../../src/migrations/)). Do not use `schema:sync` in CI.

---

## 4. Release procedure

### 4.1 Pre-flight checklist

- [ ] CI Status Check green on the release commit (lint, typecheck, unit, arch, audit, build, integration, e2e, smoke, restore-drill).
- [ ] Secrets present in `.env.production` (`npm run env:init:prod` / ops secret store).
- [ ] Pending TypeORM migrations reviewed (`npm run migration:show:prod`).
- [ ] Pre-release backup: `npm run db:backup`.
- [ ] Current release answers `/health/liveness` and `/health/readiness` (Postgres required; Redis reported on `/health`: see [REDIS.md](REDIS.md)).

### 4.2 Single-instance Compose lifecycle

```
1. npm run db:backup
2. npm run d:build:prod   # or pull GHCR tag
3. npm run d:up:full:prod # entrypoint runs scripts/docker-migrate.js then app
4. npm run smoke-test
```

Migrations run automatically via [`docker-entrypoint.sh`](../../docker-entrypoint.sh) → [`scripts/docker-migrate.js`](../../scripts/docker-migrate.js) (`synchronize: false`).

GHCR images publish from CI on `master` / semver tags (`ghcr.io/.../ecommerce-store-api`); Compose still needs an explicit image pin or local build for your host.

---

## 5. Migration safety

- Production must never enable TypeORM `synchronize: true`.
- Prefer expand/contract for destructive schema changes (add nullable → dual-write → drop later).
- Boot-time migration failure must abort container start (entrypoint does not start the API if migrate fails).

---

## 6. Rollback decision matrix

```
Did deploy fail after a migration?
        │
        ├─ Migration non-destructive (add column/table)
        │     → Option A: redeploy previous app image
        │     → Option B: npm run migration:revert:prod (when down() is safe)
        │
        └─ Migration destructive / data corruption
              → Option C: stop app → db:restore --yes → previous image → smoke
```

| Option                 | When                                    | Commands                                      |
| :--------------------- | :-------------------------------------- | :-------------------------------------------- |
| **A** Image rollback   | Schema compatible with previous release | Restart previous image/tag via Compose; smoke |
| **B** Migration revert | Last migration has a correct `down()`   | `npm run migration:revert:prod` then smoke    |
| **C** Full DB restore  | Destructive migration or bad data       | See §9.3                                      |

---

## 7. Post-deploy smoke tests

Smoke = **process-alive HTTP probes** against a running process. Not Nest DI, not checkout SAGA, not Stripe. Full flows stay in `npm run test:e2e`.

Entrypoint: [`scripts/smoke-test.js`](../../scripts/smoke-test.js) → helpers under [`scripts/smoke/`](../../scripts/smoke/).

| #   | Probe                                        | Asserts                                  |
| :-- | :------------------------------------------- | :--------------------------------------- |
| 1   | `GET /health/liveness`                       | Process viability                        |
| 2   | `GET /health/readiness`                      | PostgreSQL ready                         |
| 3   | `GET /health`                                | Composite (Postgres + Redis + WebSocket) |
| 4   | `GET /metrics`                               | Prometheus + `METRICS_API_KEY`           |
| 5   | `POST /v1/authentication/register` + `login` | Auth + JWT                               |
| 6   | `GET /v1/users/:id`                          | Authenticated DB read                    |

- **Fail-fast**: first failure exits `1`.
- **Base URL**: `--base-url=` or `SMOKE_TEST_BASE_URL` or `http://localhost:$PORT`.
- Success means probes answered: not “production fully certified.”

CI runs the same runner after `start:test` (see [PROJECT-PIPELINE.md](cicd/PROJECT-PIPELINE.md)).

---

## 8. Architectural limits (single instance)

| Area             | Baseline         | Later                              |
| :--------------- | :--------------- | :--------------------------------- |
| Host disk dumps  | Local `backups/` | Encrypted off-site (Phase 18)      |
| Horizontal scale | One API instance | Outbox, singleton jobs (Phase 15)  |
| PITR             | Not configured   | WAL archiving when RPO requires it |

---

## 9. Shell runbook

### 9.1 Manual backup

```bash
npm run db:backup
# Custom output / retention (call node directly: reliable across npm versions):
node scripts/db-backup.js --output=backups/pre-release.dump --retain=14
```

### 9.2 Standard release

```bash
npm run db:backup
npm run d:up:full:prod
npm run d:logs:full:prod   # confirm migrations then listen
npm run smoke-test
```

### 9.3 Disaster recovery restore

> Restoring overwrites the target database. Prefer Option C only when necessary.

```bash
npm run d:down:full:prod
node scripts/db-restore.js --from=backups/ecommerce-store-api_<timestamp>.dump --yes
npm run d:up:full:prod
npm run smoke-test
```

### 9.4 Revert last migration

```bash
npm run migration:revert:prod
npm run smoke-test
```

### 9.5 Restore drill

```bash
npm run db:restore:drill
```

---

## 10. References

1. PostgreSQL Backup and Restore: https://www.postgresql.org/docs/current/backup.html
2. Twelve-Factor App (config / build-once): https://12factor.net/
3. OWASP Database Security Cheat Sheet: https://cheatsheetseries.owasp.org/

