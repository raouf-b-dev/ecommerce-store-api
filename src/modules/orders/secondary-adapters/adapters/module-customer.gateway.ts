import { Injectable } from '@nestjs/common';
import {
  CustomerGateway,
  CheckoutCustomerInfo,
  CheckoutCustomerAddress,
} from '../../core/application/ports/customer.gateway';
import { GetCustomerUseCase } from '../../../customers/core/application/usecases/get-customer/get-customer.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';

@Injectable()
export class ModuleCustomerGateway implements CustomerGateway {
  constructor(private readonly getCustomerUseCase: GetCustomerUseCase) {}

  async validateCustomer(
    userId: number,
  ): Promise<Result<CheckoutCustomerInfo, InfrastructureError>> {
    const result = await this.getCustomerUseCase.execute(userId);

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError(
        'Failed to validate customer',
        result.error,
      );
    }

    const customer = result.value;

    // Translate upstream Customer → downstream CheckoutCustomerInfo
    const customerInfo: CheckoutCustomerInfo = {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      addresses: (customer.addresses || []).map(
        (addr): CheckoutCustomerAddress => ({
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

    return Result.success(customerInfo);
  }
}
