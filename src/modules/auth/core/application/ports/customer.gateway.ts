import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';

export interface CreateCustomerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface CustomerRecord {
  id: number | null;
}

export interface CustomerGateway {
  createCustomer(
    input: CreateCustomerInput,
  ): Promise<Result<CustomerRecord, InfrastructureError>>;
}
