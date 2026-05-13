# 📊 Monitoring Stack Guide

> A comprehensive guide to the E-Commerce Store API observability stack (Prometheus, Loki, Tempo, Grafana).

## Architecture Overview

```text
┌────────────────┐      ┌────────────────┐      ┌────────────────┐
│  E-Commerce    │─────▶│   Prometheus   │─────▶│    Grafana     │
│      API       │ metrics │   (Metrics)    │      │  (Dashboards)  │
└────────────────┘      └────────────────┘      └───────▲────────┘
        │                       ▲                       │
        │ logs                  │ metrics               │
        ▼                       │                       │
┌────────────────┐      ┌───────┴────────┐      ┌───────┴────────┐
│    Promtail    │─────▶│      Loki      │      │     Tempo      │
│ (Log Collector)│ logs │ (Log Storage)  │      │(Trace Storage) │
└────────────────┘      └───────▲────────┘      └───────▲────────┘
                                │                       │
                                └───────────────────────┘
                                     Trace Correlation
```

## Quick Start

1. **Start the Infrastructure**:

   ```bash
   npm run d:up:dev
   ```

   This starts Postgres, Redis, Prometheus, Loki, Promtail, Tempo, and Grafana.

2. **Access Grafana**:
   - URL: [http://localhost:3001](http://localhost:3001)
   - Credentials: `admin` / `admin`

3. **Check Service Health**:
   - Prometheus: [http://localhost:9090](http://localhost:9090)
   - Loki: [http://localhost:3100/ready](http://localhost:3100/ready)
   - Tempo: [http://localhost:3200/ready](http://localhost:3200/ready)

## Dashboards

The stack comes with 4 pre-provisioned dashboards in the **"E-Commerce API"** folder:

1. **API Overview (RED Method)**:
   - **Request Rate**: Total HTTP requests per second.
   - **Error Rate**: Percentage of 5xx responses.
   - **Latency (P50, P95, P99)**: Request duration distribution.
   - **Heatmap**: Visual distribution of request durations.

2. **Business Metrics**:
   - **Orders**: Total orders created and creation rate.
   - **Payments**: Captured and Refunded payment totals.
   - **Auth**: Success vs Failure login rates with failure reasons.
   - **Checkouts**: Cart checkout initiation vs completion rates.

3. **Infrastructure (USE Method)**:
   - **Database**: Postgres pool active connections.
   - **Redis**: Connection status (UP/DOWN).
   - **Queues**: BullMQ queue depths (active/waiting/delayed).
   - **WebSockets**: Active real-time connections.
   - **Node.js**: Heap usage, Event Loop lag, CPU usage.

4. **Checkout SAGA**:
   - **Throughput**: Success vs Failure of checkout workflows.
   - **Compensations**: Breakdown of rollback steps (e.g., refund_payment, release_stock).
   - **Traces**: Recent SAGA traces with direct links to Tempo.

## Log ↔ Trace Correlation

This stack implements bidirectional correlation between logs and traces:

### From Logs to Traces

In Grafana **Explore** (Loki), every log line from the API contains a `traceId`. Clicking the `traceId` will automatically open the corresponding trace in Tempo in a split-screen view.

### From Traces to Logs

In Grafana **Explore** (Tempo), clicking the "Logs for this span" button will automatically filter Loki logs to show exactly what happened during that specific trace span.

## Environment Variables

| Variable                      | Default                 | Description                                              |
| ----------------------------- | ----------------------- | -------------------------------------------------------- |
| `METRICS_API_KEY`             | (required)              | Shared secret between API and Prometheus                 |
| `OTEL_TRACING_ENABLED`        | `true`                  | Enable/Disable OpenTelemetry tracing                     |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4317` | Tempo OTLP receiver endpoint                             |
| `GRAFANA_ADMIN_USER`          | `admin`                 | Grafana admin username (cannot be 'admin' in production) |
| `GRAFANA_ADMIN_PASSWORD`      | `admin`                 | Grafana admin password (cannot be 'admin' in production) |

> [!IMPORTANT]
> For security reasons, the monitoring stack will **fail to start** if `GRAFANA_ADMIN_USER` or `GRAFANA_ADMIN_PASSWORD` are set to the default value `admin`. Please update these in your `.env` file before deploying.

## Troubleshooting

- **No Metrics in Grafana**: Check if the API is running and reachable by Prometheus (`http://localhost:9090/targets`).
- **No Logs in Loki**: Verify `ecom-promtail` container logs. It needs access to `/var/run/docker.sock` to discover containers.
- **No Traces in Tempo**: Ensure `OTEL_TRACING_ENABLED=true` in your `.env` and the API can reach `tempo:4317`.
