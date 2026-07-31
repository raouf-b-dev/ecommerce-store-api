// src/modules/carts/testing/mocks/cart-repository.mock.ts
import {
  CartRepository,
  CreateCartInput,
} from '../../core/domain/repositories/cart.repository';
import { Result } from '../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../shared-kernel/domain/exceptions/repository.error';
import { Cart } from '../../core/domain/entities/cart';
import { ICart } from '../../core/domain/interfaces/cart.interface';

export class MockCartRepository implements CartRepository {
  // Jest mock functions
  create = jest.fn<Promise<Result<Cart, RepositoryError>>, [CreateCartInput]>();
  findById = jest.fn<Promise<Result<Cart, RepositoryError>>, [number]>();
  update = jest.fn<Promise<Result<Cart, RepositoryError>>, [Cart]>();
  findByuserId = jest.fn<Promise<Result<Cart, RepositoryError>>, [number]>();
  delete = jest.fn<Promise<Result<void, RepositoryError>>, [number]>();

  // Helper methods for common test scenarios
  mockSuccessfulFind(cartPrimitives: ICart): void {
    const domainCart = Cart.fromPrimitives(cartPrimitives);
    this.findByuserId.mockResolvedValue(Result.success(domainCart));
  }

  mockCartNotFound(id: string): void {
    const error = new RepositoryError(`Cart not found`);
    this.findByuserId.mockResolvedValue(Result.failure(error));
  }

  mockSuccessfulCreate(cart: Cart): void {
    this.create.mockResolvedValue(Result.success(cart));
  }

  mockCreateFailure(errorMessage: string): void {
    this.create.mockResolvedValue(
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

  // Reset all mocks
  reset(): void {
    jest.clearAllMocks();
  }

  // Verify no unexpected calls were made
  verifyNoUnexpectedCalls(): void {
    expect(this.create).not.toHaveBeenCalled();
    expect(this.findById).not.toHaveBeenCalled();
    expect(this.findByuserId).not.toHaveBeenCalled();
    expect(this.update).not.toHaveBeenCalled();
    expect(this.delete).not.toHaveBeenCalled();
  }
}
