import { Address } from '../entities/address';
import { Result } from 'src/shared-kernel/domain/result';
import { RepositoryError } from 'src/shared-kernel/domain/exceptions/repository.error';

export abstract class AddressRepository {
  abstract findById(
    id: number,
  ): Promise<Result<Address | null, RepositoryError>>;
  abstract findByUserId(
    userId: number,
  ): Promise<Result<Address[] | null, RepositoryError>>;
  abstract findDefaultAddress(
    userId: number,
  ): Promise<Result<Address | null, RepositoryError>>;
  abstract create(address: Address): Promise<Result<void, RepositoryError>>;
  abstract update(address: Address): Promise<Result<void, RepositoryError>>;
  abstract delete(id: number): Promise<Result<void, RepositoryError>>;
}
