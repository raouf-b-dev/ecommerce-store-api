import { Injectable, HttpStatus } from '@nestjs/common';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { AddressType } from '../../domain/value-objects/address-type';
import { CustomerRepository } from '../../domain/repositories/customer.repository';
import { CreateCustomerUseCase } from '../usecases/create-customer/create-customer.usecase';

export interface SeedDemoCustomerResult {
  id: number;
  email: string;
  status: 'created' | 'existing';
}

@Injectable()
export class SeedDemoCustomerUseCase extends UseCase<
  void,
  SeedDemoCustomerResult,
  UseCaseError
> {
  private readonly customerEmail = 'customer@store.local';

  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly createCustomerUseCase: CreateCustomerUseCase,
  ) {
    super();
  }

  async execute(): Promise<Result<SeedDemoCustomerResult, UseCaseError>> {
    const existingResult = await this.customerRepository.findByEmail(
      this.customerEmail,
    );

    if (existingResult.isSuccess) {
      return Result.success({
        id: existingResult.value.id!,
        email: this.customerEmail,
        status: 'existing',
      });
    }

    if (existingResult.error.statusCode !== HttpStatus.NOT_FOUND) {
      return ErrorFactory.UseCaseError(
        'Failed to check existing demo customer',
        existingResult.error,
      );
    }

    const createResult = await this.createCustomerUseCase.execute({
      firstName: 'Test',
      lastName: 'Customer',
      email: this.customerEmail,
      phone: '+15550199',
      address: {
        street: '100 Main Street',
        street2: 'Apartment 2B',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94103',
        country: 'USA',
        type: AddressType.HOME,
        isDefault: true,
        deliveryInstructions: 'Leave packages at front door.',
      },
    });

    if (createResult.isFailure) {
      return ErrorFactory.UseCaseError(
        'Failed to seed demo customer',
        createResult.error,
      );
    }

    return Result.success({
      id: createResult.value.id!,
      email: this.customerEmail,
      status: 'created',
    });
  }
}
