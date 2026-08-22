// src/modules/carts/testing/mocks/cart-repository.mock.ts
import { CartRepository } from '../../core/domain/repositories/cart.repository';
import { Result } from '../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../shared-kernel/domain/exceptions/repository.error';
import { Cart } from '../../core/domain/entities/cart';
import { ICart } from '../../core/domain/interfaces/cart.interface';

export class MockCartRepository implements CartRepository {
  findByIdForUpdate = jest.fn<
    Promise<Result<{ entity: Cart; expectedVersion: number }, RepositoryError>>,
    [number]
  >();
  findByUserIdForUpdate = jest.fn<
    Promise<Result<{ entity: Cart; expectedVersion: number }, RepositoryError>>,
    [number]
  >();
  findById = jest.fn<Promise<Result<Cart, RepositoryError>>, [number]>();
  findByuserId = jest.fn<Promise<Result<Cart, RepositoryError>>, [number]>();
  save = jest.fn<Promise<Result<Cart, RepositoryError>>, [Cart, number?]>();
  delete = jest.fn<Promise<Result<void, RepositoryError>>, [number]>();

  mockSuccessfulFind(cartPrimitives: ICart): void {
    const domainCart = Cart.fromPrimitives(cartPrimitives);
    this.findByuserId.mockResolvedValue(Result.success(domainCart));
    this.findById.mockResolvedValue(Result.success(domainCart));
    this.findByIdForUpdate.mockResolvedValue(
      Result.success({ entity: domainCart, expectedVersion: 1 }),
    );
    this.findByUserIdForUpdate.mockResolvedValue(
      Result.success({ entity: domainCart, expectedVersion: 1 }),
    );
  }

  mockCartNotFound(id: string): void {
    const error = new RepositoryError(`Cart with id ${id} not found`);
    this.findByuserId.mockResolvedValue(Result.failure(error));
    this.findById.mockResolvedValue(Result.failure(error));
    this.findByIdForUpdate.mockResolvedValue(Result.failure(error));
    this.findByUserIdForUpdate.mockResolvedValue(Result.failure(error));
  }

  mockSuccessfulSave(cart?: Cart): void {
    if (cart) {
      this.save.mockResolvedValue(Result.success(cart));
    } else {
      this.save.mockImplementation((c: Cart) =>
        Promise.resolve(Result.success(c)),
      );
    }
  }

  mockSaveFailure(errorMessage: string): void {
    this.save.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulDelete(): void {
    this.delete.mockResolvedValue(Result.success(undefined));
  }

  mockDeleteFailure(errorMessage: string): void {
    this.delete.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  reset(): void {
    jest.clearAllMocks();
  }

  verifyNoUnexpectedCalls(): void {
    expect(this.findById).not.toHaveBeenCalled();
    expect(this.findByuserId).not.toHaveBeenCalled();
    expect(this.save).not.toHaveBeenCalled();
    expect(this.delete).not.toHaveBeenCalled();
  }
}
