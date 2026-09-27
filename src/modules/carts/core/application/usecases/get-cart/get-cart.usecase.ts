import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  CART_ACCESS_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';
import { CartQueryService } from '../../ports/cart-query.service';
import { CartPresentationDTO } from '../../queries/results/cart-presentation.result';

export interface GetCartInput {
  cartId?: number;
  userId?: number;
  callerContext: CallerContext | null;
}

@Injectable()
export class GetCartUseCase extends UseCase<
  GetCartInput,
  CartPresentationDTO,
  UseCaseError
> {
  constructor(private readonly cartQueryService: CartQueryService) {
    super();
  }

  async execute(
    input: GetCartInput,
  ): Promise<Result<CartPresentationDTO, UseCaseError>> {
    const { cartId, userId, callerContext } = input;

    if (!callerContext) {
      return ErrorFactory.UseCaseError(
        `Cart ${cartId || userId || ''} not found`,
      );
    }

    const scope = OwnedResourceAccessPolicy.resolveResourceScope(
      callerContext,
      CART_ACCESS_PERMISSIONS,
    );

    if (!scope.allowed) {
      return ErrorFactory.UseCaseError(
        `Cart ${cartId || userId || ''} not found`,
      );
    }

    let result: Result<CartPresentationDTO | null, any>;

    if (cartId) {
      result = await this.cartQueryService.getById(
        cartId,
        scope.authorizedUserId,
      );
    } else if (userId) {
      result = await this.cartQueryService.getByUserId(
        userId,
        scope.authorizedUserId,
      );
    } else if (scope.authorizedUserId) {
      result = await this.cartQueryService.getByUserId(
        scope.authorizedUserId,
        scope.authorizedUserId,
      );
    } else {
      return ErrorFactory.UseCaseError('Cart ID or User ID is required');
    }

    if (isFailure(result) || !result.value) {
      return ErrorFactory.UseCaseError(
        `Cart ${cartId || userId || ''} not found`,
      );
    }

    return Result.success(result.value);
  }
}
