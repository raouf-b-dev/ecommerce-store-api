import { Test, TestingModule } from '@nestjs/testing';
import {
  ValidateCheckoutUseCase,
  ValidateCheckoutInput,
} from './validate-checkout.usecase';
import { ShippingAddressResolver } from '../../../domain/services/shipping-address-resolver';
import { Result } from '../../../../../core/domain/result';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { CustomerTestFactory } from '../../../../customers/testing/factories/customer.factory';
import { Customer } from '../../../../customers/domain/entities/customer';
import { CartTestFactory } from '../../../../carts/testing/factories/cart.factory';
import { OrderTestFactory } from '../../../testing/factories/order.factory';
import { CustomerGateway } from '../../ports/customer.gateway';
import { CartGateway } from '../../ports/cart.gateway';
import { CART_GATEWAY, CUSTOMER_GATEWAY } from '../../../order.token';

describe('ValidateCheckoutUseCase', () => {
  let useCase: ValidateCheckoutUseCase;
  let customerGateway: jest.Mocked<CustomerGateway>;
  let cartGateway: jest.Mocked<CartGateway>;
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
    const mockCustomerGateway = {
      validateCustomer: jest.fn(),
    };

    const mockCartGateway = {
      validateCart: jest.fn(),
    };

    const mockAddressResolver = {
      resolve: jest.fn(),
      resolveFromDto: jest.fn(),
      resolveFromDefault: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateCheckoutUseCase,
        { provide: CUSTOMER_GATEWAY, useValue: mockCustomerGateway },
        { provide: CART_GATEWAY, useValue: mockCartGateway },
        { provide: ShippingAddressResolver, useValue: mockAddressResolver },
      ],
    }).compile();

    useCase = module.get<ValidateCheckoutUseCase>(ValidateCheckoutUseCase);
    customerGateway = module.get(CUSTOMER_GATEWAY);
    cartGateway = module.get(CART_GATEWAY);
    addressResolver = module.get(ShippingAddressResolver);
  });

  describe('successful validation', () => {
    it('should return validated context when all validations pass', async () => {
      customerGateway.validateCustomer.mockResolvedValue(
        Result.success(mockCustomer),
      );
      cartGateway.validateCart.mockResolvedValue(Result.success(mockCart));
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

      customerGateway.validateCustomer.mockResolvedValue(
        Result.success(mockCustomer),
      );
      cartGateway.validateCart.mockResolvedValue(Result.success(mockCart));
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
      customerGateway.validateCustomer.mockResolvedValue(
        Result.failure({ message: 'Customer not found' } as any),
      );

      const input: ValidateCheckoutInput = {
        cartId: mockCartId,
        userId: mockUserId,
      };

      const result = await useCase.execute(input);

      ResultAssertionHelper.assertResultFailure(result);
      expect(cartGateway.validateCart).not.toHaveBeenCalled();
    });

    it('should return failure when cart not found', async () => {
      customerGateway.validateCustomer.mockResolvedValue(
        Result.success(mockCustomer),
      );
      cartGateway.validateCart.mockResolvedValue(
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
      customerGateway.validateCustomer.mockResolvedValue(
        Result.success(mockCustomer),
      );
      cartGateway.validateCart.mockResolvedValue(
        Result.success({ ...mockCart, items: [] }),
      );

      const input: ValidateCheckoutInput = {
        cartId: mockCartId,
        userId: mockUserId,
      };

      const result = await useCase.execute(input);

      ResultAssertionHelper.assertResultFailure(result);
    });

    it('should return failure when no shipping address can be resolved', async () => {
      customerGateway.validateCustomer.mockResolvedValue(
        Result.success(mockCustomer),
      );
      cartGateway.validateCart.mockResolvedValue(Result.success(mockCart));
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
