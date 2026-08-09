import { IncomingMessage } from 'http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

const isTracingEnabled = process.env.OTEL_TRACING_ENABLED !== 'false';

if (isTracingEnabled) {
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'ecommerce-store-api',
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version || '0.5.0',
      ['deployment.environment']: process.env.NODE_ENV || 'development',
    }),
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable fs instrumentation — too noisy, no value for this API
        '@opentelemetry/instrumentation-fs': { enabled: false },
        // Configure HTTP to ignore health/metrics polling
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingRequestHook: (req: IncomingMessage) => {
            const path = req.url || '';
            return path.includes('/health') || path.includes('/metrics');
          },
        },
      }),
    ],
  });

  sdk.start();

  let isShuttingDown = false;

  // Graceful shutdown — flush pending spans before process exits
  const shutdown = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    sdk
      .shutdown()
      .then(() => {
        process.stderr.write('OTel SDK shut down successfully\n');
      })
      .catch((error) => {
        process.stderr.write(
          `Error shutting down OTel SDK: ${String(error)}\n`,
        );
      });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
