import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import sanitizeHtml, { IOptions } from 'sanitize-html';

export const SKIP_SANITIZATION_KEY = 'SKIP_SANITIZATION';

/**
 * Decorator to opt out a controller or handler from XSS input sanitization.
 * Used on authentication endpoints (to preserve credential characters) and
 * webhook endpoints (to avoid in-place mutation of the parsed request body).
 */
export const SkipSanitization = () => SetMetadata(SKIP_SANITIZATION_KEY, true);

const SANITIZE_OPTIONS: IOptions = {
  allowedTags: [],
  allowedAttributes: {},
};

/**
 * Recursively strips HTML/JS from all string values in the target.
 * Handles nested objects and arrays; skips non-string primitives.
 */
function sanitizeDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return sanitizeHtml(value, SANITIZE_OPTIONS) as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeDeep(item)) as unknown as T;
  }

  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeDeep(val);
    }
    return sanitized as T;
  }

  return value;
}

@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isSkipped = this.reflector.getAllAndOverride<boolean>(
      SKIP_SANITIZATION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isSkipped) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    if (request.body && typeof request.body === 'object') {
      request.body = sanitizeDeep(request.body);
    }

    return next.handle();
  }
}

export { sanitizeDeep };
