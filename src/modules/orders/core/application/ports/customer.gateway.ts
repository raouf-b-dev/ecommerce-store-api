import { Result } from '../../../../../shared-kernel/domain/result';
import { ICustomer } from '../../../../customers/core/domain/interfaces/customer.interface';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';

export interface CustomerGateway {
  validateCustomer(
    userId: number,
  ): Promise<Result<ICustomer, InfrastructureError>>;
}
