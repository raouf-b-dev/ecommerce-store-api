# Monitoring Stack Guide

Reference for the E-Commerce Store API observability stack: Prometheus, Loki, Tempo, Grafana, and Promtail.

## Architecture Overview

```text
API -> Prometheus -> Grafana
API -> Tempo -> Grafana
Promtail -> Loki -> Grafana
```

## Local Boot Model

### Core only (default)

```bash
npm run d:up:dev
```

This starts only PostgreSQL and Redis.

### Core + observability

```bash
npm run d:up:obs:dev
```

This starts PostgreSQL, Redis, Prometheus, Loki, Promtail, Tempo, and Grafana.

To stop the monitoring plane while keeping core infra running:

```bash
npm run d:stop:obs:dev
```

## Default Host Ports

| Service         | Container port | Default host port | Env override           |
| :-------------- | :------------- | :---------------- | :--------------------- |
| Prometheus      | `9090`         | `9090`            | `PROMETHEUS_HOST_PORT` |
| Loki            | `3100`         | `3100`            | `LOKI_HOST_PORT`       |
| Tempo HTTP      | `3200`         | `3200`            | `TEMPO_HOST_PORT`      |
| Tempo OTLP gRPC | `4317`         | `4317`            | `OTLP_GRPC_HOST_PORT`  |
| Tempo OTLP HTTP | `4318`         | `4318`            | `OTLP_HTTP_HOST_PORT`  |
| Grafana         | `3000`         | `3001`            | `GRAFANA_HOST_PORT`    |

## Access URLs

Use your env values when remapped locally.

- Grafana: `http://localhost:<GRAFANA_HOST_PORT>`
- Prometheus: `http://localhost:<PROMETHEUS_HOST_PORT>`
- Loki readiness: `http://localhost:<LOKI_HOST_PORT>/ready`
- Tempo readiness: `http://localhost:<TEMPO_HOST_PORT>/ready`

## Dashboards

The stack provisions dashboards for:

1. API RED metrics
2. Business metrics
3. Infrastructure signals
4. Checkout SAGA traces

## Environment Rules

| Variable                      | Default                 | Purpose                                |
| :---------------------------- | :---------------------- | :------------------------------------- |
| `METRICS_API_KEY`             | required                | Prometheus bearer auth for `/metrics`  |
| `OTEL_TRACING_ENABLED`        | `true`                  | Enable OpenTelemetry tracing           |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4317` | Host endpoint used by the API process  |
| `OTLP_GRPC_HOST_PORT`         | `4317`                  | Host port published for Tempo gRPC     |
| `OTLP_HTTP_HOST_PORT`         | `4318`                  | Host port published for Tempo HTTP     |
| `TEMPO_HOST_PORT`             | `3200`                  | Host port published for Tempo UI / API |
| `PROMETHEUS_HOST_PORT`        | `9090`                  | Host port published for Prometheus     |
| `GRAFANA_HOST_PORT`           | `3001`                  | Host port published for Grafana        |
| `LOKI_HOST_PORT`              | `3100`                  | Host port published for Loki           |

### Coupling to remember

- If `OTLP_GRPC_HOST_PORT` changes, `OTEL_EXPORTER_OTLP_ENDPOINT` must change to the same host port.
- Local Prometheus scrapes `host.docker.internal:$PORT`. Compose passes `PORT` into the Prometheus container; [`entrypoint.sh`](../../docker/monitoring/prometheus/entrypoint.sh) renders [`prometheus.yml.template`](../../docker/monitoring/prometheus/prometheus.yml.template). After changing `PORT` in `.env.development`, recreate Prometheus (`npm run d:up:obs:dev` or force-recreate `prometheus`).
- Production Prometheus uses [`prometheus.prod.yml`](../../docker/monitoring/prometheus/prometheus.prod.yml) and scrapes `api:3000` inside the Compose network, so this local host-port coupling does not apply there.

## Troubleshooting

- No metrics in Grafana: check Prometheus targets (`http://localhost:<PROMETHEUS_HOST_PORT>/targets`) and confirm the scrape address uses the same `PORT` as the host-run API.
- No logs in Loki: inspect `ecom-promtail` and confirm Docker socket access.
- No traces in Tempo: confirm `OTEL_TRACING_ENABLED=true` and that `OTEL_EXPORTER_OTLP_ENDPOINT` matches the published gRPC host port. Note: `npm run start:dev` does not load the OTel SDK; use `start:built` / prod scripts for traces.
- Windows bind failures: see [`../infrastructure/TROUBLESHOOTING.md`](../infrastructure/TROUBLESHOOTING.md).

## When to Extract

Keep observability in-repo until one of these becomes true:

- multiple applications share the same monitoring plane
- observability deploy cadence diverges from the API deploy cadence
- a separate platform/ops owner needs independent control over dashboards, retention, and secrets
