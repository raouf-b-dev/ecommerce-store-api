# Troubleshooting

Common issues and solutions for the E-Commerce Store API.

---

## Docker services will not start

**Symptom**: Compose fails to bind ports or a container never becomes healthy.

```bash
npm run d:down:dev
npm run d:up:dev
```

If you only need Postgres and Redis, keep the default core stack and start observability separately:

```bash
npm run d:up:dev
npm run d:up:obs:dev
```

---

## Migration errors

**Symptom**: TypeORM migration fails or schema is out of sync.

```bash
npm run d:up:dev
npm run migration:show:dev
npm run d:reset:dev
npm run migration:run:dev
```

---

## Test failures

**Symptom**: Tests fail with connection errors or open handles.

```bash
npm run test:ci
npm run test -- --detectOpenHandles
npm run d:reset:test
```

---

## Environment issues

- Verify all required environment variables are set.
- Check [`.env.example`](../../.env.example) for the complete list of keys.
- Ensure Docker services are healthy before running the application.
- Use `npm run env:init` to regenerate environment files from templates.

---

## Port conflicts (`EADDRINUSE`)

**Symptom**: API crashes on startup with `EADDRINUSE`.

1. Find and stop the process using the port.
2. Or change the `PORT` value in your `.env.*` file.
3. The API logs the conflict and exits with a non-zero code.

---

## Windows: `EACCES` / Docker bind permission denied on reserved ports

**Symptom**:

- API: `listen EACCES: permission denied 0.0.0.0:3000`
- Docker: `ports are not available ... bind: An attempt was made to access a socket in a way forbidden by its access permissions`

**Cause**: Windows Hyper-V / WSL / WinNAT reserved TCP ranges. Confirm with:

```powershell
netsh interface ipv4 show excludedportrange protocol=tcp
```

If you see ranges like `3000-3099` or `3100-3199`, those host ports are reserved even when `netstat` shows nothing listening.

### Preferred fix

Run an elevated shell:

```powershell
net stop winnat
netsh int ipv4 delete excludedportrange protocol=tcp startport=3000 numberofports=100
netsh int ipv4 delete excludedportrange protocol=tcp startport=3100 numberofports=100
net start winnat
netsh interface ipv4 show excludedportrange protocol=tcp
```

Restart Docker Desktop and retry.

### Temporary workaround

Remap host ports outside the reserved range in `.env.development` (and keep `CORS_ALLOWED_ORIGINS` and `OTEL_EXPORTER_OTLP_ENDPOINT` in sync with `PORT` / `OTLP_GRPC_HOST_PORT`). Do not rely on `env:init --overwrite` for this: that script copies ports from [`.env.example`](../../.env.example) and would also rotate generated secrets.

Example values:

```env
PORT=4000
GRAFANA_HOST_PORT=3301
LOKI_HOST_PORT=13100
PROMETHEUS_HOST_PORT=19090
TEMPO_HOST_PORT=13200
OTLP_GRPC_HOST_PORT=14317
OTLP_HTTP_HOST_PORT=14318
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:14317
CORS_ALLOWED_ORIGINS=http://localhost:4000,http://localhost:5173,http://localhost:5174
```

Then:

```bash
npm run d:up:dev
npm run d:up:obs:dev
npm run start:dev
```

Core-only boot avoids Grafana/Loki/Tempo bind failures until you need the monitoring plane.

---

## Metrics missing after local port remap

- Confirm the API is running on the `PORT` value from `.env.development`.
- Recreate Prometheus after changing `PORT` so `entrypoint.sh` re-renders the scrape target (`npm run d:up:obs:dev` or `docker compose ... up -d --force-recreate prometheus`).
- Check Prometheus targets at `http://localhost:<PROMETHEUS_HOST_PORT>/targets`: scrape URL should be `host.docker.internal:<PORT>/metrics`.
- Confirm `METRICS_API_KEY` matches the API env.

---

## Traces missing after OTLP remap

- Confirm `OTEL_TRACING_ENABLED=true`.
- Confirm `OTEL_EXPORTER_OTLP_ENDPOINT` matches `OTLP_GRPC_HOST_PORT`.
- Confirm Tempo is healthy on `http://localhost:<TEMPO_HOST_PORT>/ready`.
- Restart the API after changing OTLP settings.

---

## False role / BullMQ errors on Ctrl+C or watch restart

**Symptom**: Logs like `Failed to lookup role`, `Failed to update system role`, or `Failed to schedule cleanup job` appear around the same time as `Received SIGINT` / graceful shutdown, even though the process may still print `Server is running`.

**Cause**: Nest watch restart or Ctrl+C closes Redis/Postgres while role/permission bootstrap or BullMQ repeatable-job registration is still in flight.

**Expected**: Init hooks consult `ApplicationLifecyclePort` and skip or demote those failures during shutdown. On a clean start with core Docker up (`npm run d:up:dev`), roles and schedulers should succeed with no errors.

**Related**: `duplicate key ... UQ_... role_permissions` on every restart used to come from delete-all/reinsert of join rows (and TypeORM cascade). Role permission sync is now a transactional diff; up-to-date system roles skip `update` entirely.

---

## Slow local `npm run start` / `start:dev` with observability down

**Symptom**: Host API start feels slow even when Grafana/Tempo/Prometheus are not running.

**Note**: `npm run start` and `npm run start:dev` do **not** load OpenTelemetry (`tracing.js` is only required by `start:built` / `start:prod` / `start:staging`). Missing observability containers do not block those scripts.

**Investigate**:

```powershell
Measure-Command { npm run build }
Measure-Command { npm run start:built }
```

If `build` dominates, cost is Nest/SWC compile (and Nest CLI `typeCheck`). If `start:built` dominates, cost is runtime (Postgres, Redis, module init). Non-prod TypeORM logging is limited to `error`/`warn` to reduce bootstrap I/O.
