import { Result } from '../../../../shared-kernel/domain/result';
import {
  CartGateway,
  CheckoutCartInfo,
} from '../../core/application/ports/cart.gateway';
import { InfrastructureError } from 'src/shared-kernel/domain/exceptions/infrastructure-error';
import { UseCaseError } from 'src/shared-kernel/domain/exceptions/usecase.error';
import { CallerContext } from 'src/shared-kernel/domain/interfaces/caller-context.interface';

export class MockCartGateway implements CartGateway {
  validateCart = jest.fn<
    Promise<Result<CheckoutCartInfo, InfrastructureError>>,
    [number]
  >();

  validateCartForCheckout = jest.fn<
    Promise<Result<CheckoutCartInfo, UseCaseError>>,
    [
      {
        cartId: number;
        callerContext: CallerContext | null;
        cartToken: string | null;
      },
    ]
  >();
  getCart = jest.fn<
    Promise<Result<CheckoutCartInfo, InfrastructureError>>,
    [number]
  >();
  clearCart = jest.fn<Promise<Result<void, InfrastructureError>>, [number]>();

  mockSuccessfulValidate(cart: CheckoutCartInfo): void {
    this.validateCart.mockResolvedValue(Result.success(cart));
  }

  mockValidateError(error: InfrastructureError): void {
    this.validateCart.mockResolvedValue(Result.failure(error));
  }

  mockSuccessfulValidateForCheckout(cart: CheckoutCartInfo): void {
    this.validateCartForCheckout.mockResolvedValue(Result.success(cart));
  }

  mockValidateErrorForCheckout(error: InfrastructureError): void {
    this.validateCartForCheckout.mockResolvedValue(Result.failure(error));
  }

  // Reset all mocks
  reset(): void {
    jest.clearAllMocks();
  }

  // Verify no unexpected calls were made
  verifyNoUnexpectedCalls(): void {
    expect(this.validateCart).not.toHaveBeenCalled();
    expect(this.validateCartForCheckout).not.toHaveBeenCalled();
    expect(this.getCart).not.toHaveBeenCalled();
    expect(this.clearCart).not.toHaveBeenCalled();
  }
}
