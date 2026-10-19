import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { EnvConfigService } from '../../../../config/env-config.service';

/** Header name Express exposes in lower case. Documented as X-Demo-Reset-Token. */
export const DEMO_RESET_TOKEN_HEADER = 'x-demo-reset-token';

/**
 * Constant-time compare. Length mismatches return false before
 * timingSafeEqual, which throws when buffer lengths differ.
 */
export function demoResetTokensMatch(
  expected: string,
  provided: string,
): boolean {
  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(provided, 'utf8');
  if (expectedBuf.length === 0 || expectedBuf.length !== providedBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, providedBuf);
}

@Injectable()
export class DemoResetAuthGuard implements CanActivate {
  private readonly logger = new Logger(DemoResetAuthGuard.name);

  constructor(private readonly config: EnvConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.config.demo.resetEnabled) {
      throw new NotFoundException();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers[DEMO_RESET_TOKEN_HEADER];
    const provided = typeof header === 'string' ? header : '';

    if (!demoResetTokensMatch(this.config.demo.resetToken, provided)) {
      this.logger.warn('demo_reset_rejected');
      throw new UnauthorizedException();
    }

    return true;
  }
}
