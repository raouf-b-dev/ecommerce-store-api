import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Exclude metrics and health endpoints from tracking to avoid noise
    if (req.path?.startsWith('/metrics') || req.path?.startsWith('/health')) {
      return next();
    }

    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const durationSec = Number(process.hrtime.bigint() - start) / 1e9;

      // Fallback to UNKNOWN_ROUTE to prevent cardinality explosion if route is unmatched (e.g. 404)
      const route = req.route?.path || req.baseUrl || 'UNKNOWN_ROUTE';
      const normalizedRoute = this.normalizeRoute(route);

      const labels = {
        method: req.method,
        route: normalizedRoute,
        status_code: res.statusCode.toString(),
      };

      this.metricsService.httpRequestsTotal.inc(labels);
      this.metricsService.httpRequestDuration.observe(labels, durationSec);
    });

    next();
  }

  private normalizeRoute(route: string): string {
    // Replace UUIDs with :id
    route = route.replace(
      /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
      ':id',
    );
    // Replace integer IDs with :id (e.g., /v1/products/123 -> /v1/products/:id)
    route = route.replace(/\/\d+(?=\/|$)/g, '/:id');
    // Strip /v1/ prefix for cleaner labels
    route = route.replace(/^\/v\d+\//, '/');
    return route;
  }
}
