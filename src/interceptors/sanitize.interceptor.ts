import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import * as sanitizeHtml from 'sanitize-html';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
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
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    if (request.body && typeof request.body === 'object') {
      request.body = sanitizeDeep(request.body);
    }

    return next.handle();
  }
}

export { sanitizeDeep };
