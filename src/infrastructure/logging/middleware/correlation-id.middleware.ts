import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CorrelationService } from '../correlation/correlation.service';

/**
 * HTTP Middleware — creates a correlation context for every inbound request.
 *
 * 1. Reads `X-Request-Id` from the request header (client-provided).
 * 2. Falls back to a newly generated UUID if not present.
 * 3. Wraps the entire downstream processing in AsyncLocalStorage.run().
 * 4. Sets `X-Request-Id` on the response so the client can reference it.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  /** Standard header name used by load balancers, API gateways, and clients. */
  static readonly HEADER = 'X-Request-Id';

  constructor(private readonly correlation: CorrelationService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers[CorrelationIdMiddleware.HEADER.toLowerCase()];
    const correlationId =
      (Array.isArray(incoming) ? incoming[0] : incoming) ||
      this.correlation.generate();

    // Expose the correlation ID to downstream code via Express request
    // (useful for guards/interceptors that don't inject CorrelationService).
    req['correlationId'] = correlationId;

    // Return the ID to the client for support/debugging references.
    res.setHeader(CorrelationIdMiddleware.HEADER, correlationId);

    // Wrap the rest of the request lifecycle in the correlation context.
    this.correlation.run(correlationId, () => next());
  }
}
