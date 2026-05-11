import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';
import { EnvConfigService } from '../../config/env-config.service';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry: Registry;

  // HTTP metrics
  readonly httpRequestsTotal: Counter;
  readonly httpRequestDuration: Histogram;

  // Business metrics
  readonly ordersCreatedTotal: Counter;
  readonly checkoutSagaCompletedTotal: Counter;
  readonly checkoutSagaFailedTotal: Counter;
  readonly checkoutSagaCompensationTotal: Counter;
  readonly paymentsCapturedTotal: Counter;
  readonly paymentsRefundedTotal: Counter;
  readonly authLoginTotal: Counter;
  readonly authLoginFailuresTotal: Counter;
  readonly cartsCheckoutInitiatedTotal: Counter;

  // Infrastructure gauges
  readonly dbPoolActiveConnections: Gauge;
  readonly redisHealthStatus: Gauge;
  readonly bullmqQueueDepth: Gauge;
  readonly websocketConnectionsActive: Gauge;

  constructor(private readonly config: EnvConfigService) {
    this.registry = new Registry();
    this.registry.setDefaultLabels({
      app: 'ecommerce-store-api',
      env: this.config.node.env,
    });

    // Register HTTP
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 2.5, 5, 10],
      registers: [this.registry],
    });

    // Register Business
    this.ordersCreatedTotal = new Counter({
      name: 'orders_created_total',
      help: 'Total number of orders created',
      registers: [this.registry],
    });

    this.checkoutSagaCompletedTotal = new Counter({
      name: 'checkout_saga_completed_total',
      help: 'Total number of completed checkout SAGAs',
      registers: [this.registry],
    });

    this.checkoutSagaFailedTotal = new Counter({
      name: 'checkout_saga_failed_total',
      help: 'Total number of failed checkout SAGAs',
      registers: [this.registry],
    });

    this.checkoutSagaCompensationTotal = new Counter({
      name: 'checkout_saga_compensation_total',
      help: 'Total number of checkout SAGA compensations executed',
      labelNames: ['step'],
      registers: [this.registry],
    });

    this.paymentsCapturedTotal = new Counter({
      name: 'payments_captured_total',
      help: 'Total number of payments captured',
      registers: [this.registry],
    });

    this.paymentsRefundedTotal = new Counter({
      name: 'payments_refunded_total',
      help: 'Total number of payments refunded',
      registers: [this.registry],
    });

    this.authLoginTotal = new Counter({
      name: 'auth_login_total',
      help: 'Total number of successful logins',
      registers: [this.registry],
    });

    this.authLoginFailuresTotal = new Counter({
      name: 'auth_login_failures_total',
      help: 'Total number of failed login attempts',
      labelNames: ['reason'],
      registers: [this.registry],
    });

    this.cartsCheckoutInitiatedTotal = new Counter({
      name: 'carts_checkout_initiated_total',
      help: 'Total number of cart checkouts initiated',
      registers: [this.registry],
    });

    // Register Infra
    this.dbPoolActiveConnections = new Gauge({
      name: 'db_pool_active_connections',
      help: 'Active connections in Postgres pool',
      registers: [this.registry],
    });

    this.redisHealthStatus = new Gauge({
      name: 'redis_health_status',
      help: 'Status of Redis connection (1=up, 0=down)',
      registers: [this.registry],
    });

    this.bullmqQueueDepth = new Gauge({
      name: 'bullmq_queue_depth',
      help: 'Total number of active, waiting, and delayed jobs in BullMQ',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.websocketConnectionsActive = new Gauge({
      name: 'websocket_connections_active',
      help: 'Active WebSocket connections in gateway',
      registers: [this.registry],
    });
  }

  onModuleInit() {
    collectDefaultMetrics({ register: this.registry });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
