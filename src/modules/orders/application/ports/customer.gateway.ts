import { Result } from '../../../../core/domain/result';
import { ICustomer } from '../../../customers/domain/interfaces/customer.interface';
import { InfrastructureError } from '../../../../core/errors/infrastructure-error';

export interface CustomerGateway {
  validateCustomer(
    userId: number,
  ): Promise<Result<ICustomer, InfrastructureError>>;
}
