import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';
import { EnvConfigService } from '../../../config/env-config.service';

@Injectable()
export class MetricsAuthGuard implements CanActivate {
  private readonly logger = new Logger(MetricsAuthGuard.name);
  private hasWarned = false;

  constructor(private readonly config: EnvConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expectedKey = this.config.metricsApiKey;

    if (!expectedKey) {
      if (!this.hasWarned) {
        this.logger.warn(
          'METRICS_API_KEY is not set. /metrics endpoint will deny all requests.',
        );
        this.hasWarned = true;
      }
      throw new UnauthorizedException('Metrics API key is not configured');
    }

    // Support both X-Metrics-API-Key and Authorization: Bearer <key>
    const headerKey = request.headers['x-metrics-api-key'];
    const authHeader = request.headers['authorization'];

    let providedKey: string | undefined;

    if (headerKey && typeof headerKey === 'string') {
      providedKey = headerKey;
    } else if (
      authHeader &&
      typeof authHeader === 'string' &&
      authHeader.startsWith('Bearer ')
    ) {
      providedKey = authHeader.substring(7);
    }

    if (!providedKey) {
      this.logger.warn('Metrics endpoint accessed without API key');
      throw new UnauthorizedException('Missing metrics API key');
    }

    // Constant-time comparison to prevent timing-based side-channel attacks (CWE-208).
    const expected = Buffer.from(expectedKey, 'utf8');
    const provided = Buffer.from(providedKey, 'utf8');

    if (
      expected.length !== provided.length ||
      !timingSafeEqual(expected, provided)
    ) {
      this.logger.warn('Metrics endpoint accessed with invalid API key');
      throw new UnauthorizedException('Invalid metrics API key');
    }

    return true;
  }
}
