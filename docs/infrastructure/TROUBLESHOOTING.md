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

Remap host ports outside the reserved range in `.env.development`.

Example:

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
- Update [`docker/monitoring/prometheus/prometheus.yml`](../../docker/monitoring/prometheus/prometheus.yml) so `host.docker.internal:<PORT>` matches the host-run API port.
- Check Prometheus targets at `http://localhost:<PROMETHEUS_HOST_PORT>/targets`.
- Confirm `METRICS_API_KEY` matches the API env.

---

## Traces missing after OTLP remap

- Confirm `OTEL_TRACING_ENABLED=true`.
- Confirm `OTEL_EXPORTER_OTLP_ENDPOINT` matches `OTLP_GRPC_HOST_PORT`.
- Confirm Tempo is healthy on `http://localhost:<TEMPO_HOST_PORT>/ready`.
- Restart the API after changing OTLP settings.
