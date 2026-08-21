import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, from, throwError, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { IdempotencyStore } from '../../shared-kernel/domain/stores/idempotency.store';
import { extractIdempotencyKey } from '../../shared-kernel/infra/http/request.helpers';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotencyStore: IdempotencyStore) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const key = extractIdempotencyKey(request);

    if (!key) {
      return next.handle();
    }

    return from(this.idempotencyStore.checkAndLock(key)).pipe(
      switchMap((result) => {
        if (result.unavailable) {
          throw new ServiceUnavailableException(
            'Idempotency store unavailable — retry the request later',
          );
        }

        if (!result.isNew) {
          if (result.data) {
            return of(result.data);
          }
          throw new ConflictException(
            'A request with this idempotency key is already in progress',
          );
        }

        return next.handle().pipe(
          switchMap(async (response) => {
            try {
              await this.idempotencyStore.complete(key, response);
              return response;
            } catch {
              await this.idempotencyStore.release(key);
              throw new ServiceUnavailableException(
                'Idempotency result could not be persisted — retry the request later',
              );
            }
          }),
          catchError((err) => {
            return from(this.idempotencyStore.release(key)).pipe(
              switchMap(() => throwError(() => err)),
            );
          }),
        );
      }),
    );
  }
}
