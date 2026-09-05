import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, from, throwError, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { IdempotencyStore } from '../../shared-kernel/domain/stores/idempotency.store';
import {
  buildScopedIdempotencyKey,
  extractIdempotencyKey,
} from '../../shared-kernel/infra/http/request.helpers';
import { IDEMPOTENCY_REDIS } from '../redis/constants/redis.constants';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotencyStore: IdempotencyStore) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const clientKey = extractIdempotencyKey(request);

    if (!clientKey) {
      return next.handle();
    }

    const scopedKey = buildScopedIdempotencyKey(request, clientKey);

    return from(this.idempotencyStore.checkAndLock(scopedKey)).pipe(
      switchMap((result) => {
        if (result.unavailable) {
          throw new ServiceUnavailableException(
            'Idempotency store unavailable - retry the request later',
          );
        }

        if (!result.isNew) {
          if (result.data) {
            return of(result.data);
          }
          response.setHeader(
            'Retry-After',
            String(IDEMPOTENCY_REDIS.RETRY_AFTER_SECONDS),
          );
          throw new ConflictException(
            'A request with this idempotency key is already in progress',
          );
        }

        return next.handle().pipe(
          switchMap(async (handlerResponse) => {
            try {
              await this.idempotencyStore.complete(scopedKey, handlerResponse);
              return handlerResponse;
            } catch {
              await this.idempotencyStore.release(scopedKey);
              throw new ServiceUnavailableException(
                'Idempotency result could not be persisted - retry the request later',
              );
            }
          }),
          catchError((err) => {
            return from(this.idempotencyStore.release(scopedKey)).pipe(
              switchMap(() => throwError(() => err)),
            );
          }),
        );
      }),
    );
  }
}
