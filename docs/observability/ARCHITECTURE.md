# Observability Architecture

This diagram illustrates the observability pipeline implemented in the E-commerce Store API, capturing logs, metrics, and distributed traces.

```mermaid
graph LR
    %% Styling
    classDef default fill:#0d1117,stroke:#30363d,stroke-width:1px,color:#c9d1d9
    classDef highlight fill:#161b22,stroke:#58a6ff,stroke-width:1px,color:#c9d1d9
    classDef log fill:#0d1117,stroke:#58a6ff,stroke-width:1px,color:#c9d1d9
    classDef metric fill:#0d1117,stroke:#3fb950,stroke-width:1px,color:#c9d1d9
    classDef trace fill:#0d1117,stroke:#bc8cff,stroke-width:1px,color:#c9d1d9
    classDef tool fill:#238636,stroke:#2ea043,stroke-width:1px,color:#ffffff,font-weight:bold

    subgraph App["Application Layer"]
        API["NestJS API<br/>(Controllers, Use Cases, Jobs)"]
        Corr["Correlation ID Middleware<br/>(AsyncLocalStorage)"]
        Winston["Winston Logger"]
        PromClient["prom-client<br/>(Metrics Middleware)"]
        OTel["OpenTelemetry SDK"]

        API -.-> Corr
        Corr -.-> Winston
        Corr -.-> PromClient
        Corr -.-> OTel
    end

    subgraph Pipeline["Signal Pipeline"]
        Promtail["Promtail"]
        Prometheus["Prometheus"]
        Tempo["Tempo"]
    end

    subgraph Visualization["Visualization"]
        Grafana["Grafana<br/>(Dashboards: API, Business, Saga, Infra)"]
    end

    %% Flows
    Winston -- "Structured JSON" --> Promtail
    Promtail -- "Push" --> Loki["Loki"]

    PromClient -- "Scrape /metrics" --> Prometheus
    OTel -- "OTLP gRPC" --> Tempo

    Loki --> Grafana
    Prometheus --> Grafana
    Tempo --> Grafana

    %% Apply Classes
    class API,Corr highlight
    class Winston,Promtail,Loki log
    class PromClient,Prometheus metric
    class OTel,Tempo trace
    class Grafana tool
```

### Context Propagation

- **HTTP Requests**: `X-Request-Id` header is captured and stored in `AsyncLocalStorage`.
- **Background Jobs (BullMQ)**: Correlation ID is extracted from `AsyncLocalStorage` and embedded into the job's `data` payload before enqueueing.
- **Job Handlers**: The worker extracts the Correlation ID from the job data and wraps the execution in a new `AsyncLocalStorage` context.
- **Result**: A single trace/correlation ID links the original HTTP request to all subsequent asynchronous background processing steps.
