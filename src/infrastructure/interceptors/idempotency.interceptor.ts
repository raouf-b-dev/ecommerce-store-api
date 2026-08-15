import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
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
            await this.idempotencyStore.complete(key, response);
            return response;
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
