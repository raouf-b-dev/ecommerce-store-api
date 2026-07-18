import { Injectable } from '@nestjs/common';
import {
  UserGateway,
  CheckoutUserInfoResult,
  CheckoutUserAddress,
} from '../../core/application/ports/user.gateway';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { SYSTEM_CALLER_CONTEXT } from '../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { GetUserUseCase } from 'src/modules/access/core/application/usecases/user/get-user/get-user.usecase';

@Injectable()
export class ModuleUserGateway implements UserGateway {
  constructor(private readonly getUserUseCase: GetUserUseCase) {}

  async getUserInfo(
    userId: number,
  ): Promise<Result<CheckoutUserInfoResult, InfrastructureError>> {
    const result = await this.getUserUseCase.execute({
      userId,
      callerContext: SYSTEM_CALLER_CONTEXT,
    });

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError(
        'Failed to validate user',
        result.error,
      );
    }

    const user = result.value;

    const userInfo: CheckoutUserInfoResult = {
      id: user.id!,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      addresses: (user.addresses || []).map(
        (addr): CheckoutUserAddress => ({
          id: addr.id,
          street: addr.street,
          street2: addr.street2 ?? null,
          city: addr.city,
          state: addr.state,
          postalCode: addr.postalCode,
          country: addr.country,
          isDefault: addr.isDefault,
          deliveryInstructions: addr.deliveryInstructions ?? null,
        }),
      ),
    };

    return Result.success(userInfo);
  }
}
