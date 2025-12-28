import { Test, TestingModule } from '@nestjs/testing';
import {
  ValidateCheckoutUseCase,
  ValidateCheckoutInput,
} from './validate-checkout.usecase';
import { GetCustomerUseCase } from '../../../../customers/application/usecases/get-customer/get-customer.usecase';
import { GetCartUseCase } from '../../../../carts/application/usecases/get-cart/get-cart.usecase';
import { ShippingAddressResolver } from '../../../domain/services/shipping-address-resolver';
import { Result } from '../../../../../core/domain/result';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { CustomerTestFactory } from '../../../../customers/testing/factories/customer.factory';
import { Customer } from '../../../../customers/domain/entities/customer';
import { CartTestFactory } from '../../../../carts/testing/factories/cart.factory';
import { OrderTestFactory } from '../../../testing/factories/order.factory';

describe('ValidateCheckoutUseCase', () => {
  let useCase: ValidateCheckoutUseCase;
  let getCustomerUseCase: jest.Mocked<GetCustomerUseCase>;
  let getCartUseCase: jest.Mocked<GetCartUseCase>;
  let addressResolver: jest.Mocked<ShippingAddressResolver>;

  const mockUserId = 123;
  const mockCartId = 456;
  const mockCustomer = Customer.fromPrimitives(
    CustomerTestFactory.createCustomerWithAddress({ id: mockUserId }),
  );

  const mockCart = CartTestFactory.createCartWithItems(1, {
    id: mockCartId,
    customerId: mockUserId,
  });

  const mockResolvedAddress =
    OrderTestFactory.createMockOrder().shippingAddress;

  beforeEach(async () => {
    const mockGetCustomerUseCase = {
      execute: jest.fn(),
    };

    const mockGetCartUseCase = {
      execute: jest.fn(),
    };

    const mockAddressResolver = {
      resolve: jest.fn(),
      resolveFromDto: jest.fn(),
      resolveFromDefault: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateCheckoutUseCase,
        { provide: GetCustomerUseCase, useValue: mockGetCustomerUseCase },
        { provide: GetCartUseCase, useValue: mockGetCartUseCase },
        { provide: ShippingAddressResolver, useValue: mockAddressResolver },
      ],
    }).compile();

    useCase = module.get<ValidateCheckoutUseCase>(ValidateCheckoutUseCase);
    getCustomerUseCase = module.get(GetCustomerUseCase);
    getCartUseCase = module.get(GetCartUseCase);
    addressResolver = module.get(ShippingAddressResolver);
  });

  describe('successful validation', () => {
    it('should return validated context when all validations pass', async () => {
      getCustomerUseCase.execute.mockResolvedValue(
        Result.success(mockCustomer),
      );
      getCartUseCase.execute.mockResolvedValue({
        isSuccess: true,
        value: mockCart,
      } as any);
      addressResolver.resolve.mockReturnValue(mockResolvedAddress);

      const input: ValidateCheckoutInput = {
        cartId: mockCartId,
        userId: mockUserId,
      };

      const result = await useCase.execute(input);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.customer).toBe(mockCustomer);
      expect(result.value.cart).toBe(mockCart);
      expect(result.value.shippingAddress).toBe(mockResolvedAddress);
    });

    it('should call addressResolver with shippingAddress dto when provided', async () => {
      const shippingAddressDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        street: '456 Other St',
        city: 'LA',
        state: 'CA',
        postalCode: '90001',
        country: 'USA',
      };

      getCustomerUseCase.execute.mockResolvedValue(
        Result.success(mockCustomer),
      );
      getCartUseCase.execute.mockResolvedValue({
        isSuccess: true,
        value: mockCart,
      } as any);
      addressResolver.resolve.mockReturnValue(mockResolvedAddress);

      const input: ValidateCheckoutInput = {
        cartId: mockCartId,
        userId: mockUserId,
        shippingAddress: shippingAddressDto,
      };

      await useCase.execute(input);

      expect(addressResolver.resolve).toHaveBeenCalledWith(
        shippingAddressDto,
        mockCustomer,
      );
    });
  });

  describe('validation failures', () => {
    it('should return failure when customer not found', async () => {
      getCustomerUseCase.execute.mockResolvedValue(
        Result.failure({ message: 'Customer not found' } as any),
      );

      const input: ValidateCheckoutInput = {
        cartId: mockCartId,
        userId: mockUserId,
      };

      const result = await useCase.execute(input);

      ResultAssertionHelper.assertResultFailure(result);
      expect(getCartUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return failure when cart not found', async () => {
      getCustomerUseCase.execute.mockResolvedValue(
        Result.success(mockCustomer),
      );
      getCartUseCase.execute.mockResolvedValue(
        Result.failure({ message: 'Cart not found' } as any),
      );

      const input: ValidateCheckoutInput = {
        cartId: mockCartId,
        userId: mockUserId,
      };

      const result = await useCase.execute(input);

      ResultAssertionHelper.assertResultFailure(result);
    });

    it('should return failure when cart is empty', async () => {
      getCustomerUseCase.execute.mockResolvedValue(
        Result.success(mockCustomer),
      );
      getCartUseCase.execute.mockResolvedValue({
        isSuccess: true,
        value: { ...mockCart, items: [] },
      } as any);

      const input: ValidateCheckoutInput = {
        cartId: mockCartId,
        userId: mockUserId,
      };

      const result = await useCase.execute(input);

      ResultAssertionHelper.assertResultFailure(result);
    });

    it('should return failure when no shipping address can be resolved', async () => {
      getCustomerUseCase.execute.mockResolvedValue(
        Result.success(mockCustomer),
      );
      getCartUseCase.execute.mockResolvedValue({
        isSuccess: true,
        value: mockCart,
      } as any);
      addressResolver.resolve.mockReturnValue(null);

      const input: ValidateCheckoutInput = {
        cartId: mockCartId,
        userId: mockUserId,
      };

      const result = await useCase.execute(input);

      ResultAssertionHelper.assertResultFailure(result);
    });
  });
});
