import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { ICart } from '../../../domain/interfaces/cart.interface';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { CartRepository } from '../../../domain/repositories/cart.repository';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { CartSessionTokenGateway } from '../../ports/session-token.gateway';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';

export interface CreateCartUseCaseInput {
  callerContext: CallerContext | null;
}

export interface CreateCartResponse {
  cart: ICart;
  token?: string;
}

@Injectable()
export class CreateCartUseCase extends UseCase<
  CreateCartUseCaseInput,
  CreateCartResponse,
  UseCaseError
> {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly sessionTokenGateway: CartSessionTokenGateway,
  ) {
    super();
  }

  async execute(
    input: CreateCartUseCaseInput,
  ): Promise<Result<CreateCartResponse, UseCaseError>> {
    const { callerContext } = input;
    const isCustomerCaller =
      callerContext?.kind === 'user' && callerContext.role === 'CUSTOMER';

    if (isCustomerCaller) {
      if (!callerContext.permissions.has('manage_own_cart')) {
        return ErrorFactory.UseCaseError(
          'Not authorized to create a customer cart',
        );
      }

      const createResult = await this.cartRepository.create({
        userId: callerContext.userId,
      });

      if (isFailure(createResult)) return createResult;

      return Result.success({
        cart: createResult.value.toPrimitives(),
      });
    }

    const sessionId = crypto.randomInt(1, 2147483647);
    const createResult = await this.cartRepository.create({ sessionId });

    if (isFailure(createResult)) return createResult;

    const cart = createResult.value;
    const response: CreateCartResponse = {
      cart: cart.toPrimitives(),
    };

    if (cart.id !== null) {
      const token = await this.sessionTokenGateway.generateToken(cart.id);
      if (token.isFailure) return token;
      response.token = token.value;
    }

    return Result.success(response);
  }
}
