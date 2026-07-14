import { Test, TestingModule } from '@nestjs/testing';
import {
  ValidateCheckoutUseCase,
  ValidateCheckoutInput,
} from './validate-checkout.usecase';
import { ShippingAddressResolver } from '../../services/shipping-address-resolver';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { CartTestFactory } from '../../../../../carts/testing/factories/cart.factory';
import { OrderTestFactory } from '../../../../testing/factories/order.factory';
import { UserGateway } from '../../ports/user.gateway';
import { CartGateway } from '../../ports/cart.gateway';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import {
  createUserCallerContext,
  SYSTEM_CALLER_CONTEXT,
} from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { User } from 'src/modules/access/core/domain/entities/user';
import { UserTestFactory } from 'src/modules/access/testing/factories/user.factory';

describe('ValidateCheckoutUseCase', () => {
  let useCase: ValidateCheckoutUseCase;
  let userGateway: jest.Mocked<UserGateway>;
  let cartGateway: jest.Mocked<CartGateway>;
  let addressResolver: jest.Mocked<ShippingAddressResolver>;

  const mockuserId = 123;
  const mockCartId = 456;
  const mockUser = User.fromProps(
    UserTestFactory.createMockUser({ id: mockuserId }),
  );

  const mockCart = CartTestFactory.createCartWithItems(1, {
    id: mockCartId,
    userId: mockuserId,
  });

  const mockResolvedAddress =
    OrderTestFactory.createMockOrder().shippingAddress;

  const customerCallerContext = createUserCallerContext({
    userId: 123,
    role: 'CUSTOMER',
    permissions: new Set(['manage_own_cart']),
  });

  beforeEach(async () => {
    const mockUserGateway = {
      validateUser: jest.fn(),
    };

    const mockCartGateway = {
      validateCartForCheckout: jest.fn(),
    };

    const mockAddressResolver = {
      resolve: jest.fn(),
      resolveFromDto: jest.fn(),
      resolveFromDefault: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateCheckoutUseCase,
        { provide: UserGateway, useValue: mockUserGateway },
        { provide: CartGateway, useValue: mockCartGateway },
        { provide: ShippingAddressResolver, useValue: mockAddressResolver },
      ],
    }).compile();

    useCase = module.get<ValidateCheckoutUseCase>(ValidateCheckoutUseCase);
    userGateway = module.get(UserGateway);
    cartGateway = module.get(CartGateway);
    addressResolver = module.get(ShippingAddressResolver);
  });

  describe('successful validation', () => {
    it('should return validated context when all validations pass', async () => {
      userGateway.validateUser.mockResolvedValue(Result.success(mockUser));
      cartGateway.validateCartForCheckout.mockResolvedValue(
        Result.success(mockCart),
      );
      addressResolver.resolve.mockReturnValue(mockResolvedAddress);

      const input: ValidateCheckoutInput = {
        cartId: mockCartId,
        callerContext: customerCallerContext,
        cartToken: null,
      };

      const result = await useCase.execute(input);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.customer).toBe(mockUser);
      expect(result.value.cart).toBe(mockCart);
      expect(result.value.userId).toBe(mockuserId);
      expect(cartGateway.validateCartForCheckout).toHaveBeenCalledWith({
        cartId: mockCartId,
        callerContext: customerCallerContext,
        cartToken: null,
      });
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

      userGateway.validateUser.mockResolvedValue(Result.success(mockUser));
      cartGateway.validateCartForCheckout.mockResolvedValue(
        Result.success(mockCart),
      );
      addressResolver.resolve.mockReturnValue(mockResolvedAddress);

      const input: ValidateCheckoutInput = {
        cartId: mockCartId,
        callerContext: customerCallerContext,
        cartToken: null,
        shippingAddress: shippingAddressDto,
      };

      await useCase.execute(input);

      expect(addressResolver.resolve).toHaveBeenCalledWith(
        shippingAddressDto,
        mockUser,
      );
    });
  });

  describe('validation failures', () => {
    it('should return failure when customer not found', async () => {
      cartGateway.validateCartForCheckout.mockResolvedValue(
        Result.success(mockCart),
      );
      userGateway.validateUser.mockResolvedValue(
        ErrorFactory.RepositoryError('Customer not found'),
      );

      const input: ValidateCheckoutInput = {
        cartId: mockCartId,
        callerContext: customerCallerContext,
        cartToken: null,
      };

      const result = await useCase.execute(input);

      ResultAssertionHelper.assertResultFailure(result);
    });

    it('should return failure when cart not found', async () => {
      cartGateway.validateCartForCheckout.mockResolvedValue(
        ErrorFactory.RepositoryError('Cart not found'),
      );

      const input: ValidateCheckoutInput = {
        cartId: mockCartId,
        callerContext: customerCallerContext,
        cartToken: null,
      };

      const result = await useCase.execute(input);

      ResultAssertionHelper.assertResultFailure(result);
      expect(userGateway.validateUser).not.toHaveBeenCalled();
    });

    it('should return failure when cart is empty', async () => {
      cartGateway.validateCartForCheckout.mockResolvedValue(
        Result.success({ ...mockCart, items: [] }),
      );

      const input: ValidateCheckoutInput = {
        cartId: mockCartId,
        callerContext: customerCallerContext,
        cartToken: null,
      };

      const result = await useCase.execute(input);

      ResultAssertionHelper.assertResultFailure(result);
    });

    it('should reject checkout when caller lacks customer account', async () => {
      const input: ValidateCheckoutInput = {
        cartId: mockCartId,
        callerContext: null,
        cartToken: 'guest-token',
      };

      const result = await useCase.execute(input);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Checkout requires a customer account',
      );
    });

    it('should allow system caller to revalidate during saga', async () => {
      userGateway.validateUser.mockResolvedValue(Result.success(mockUser));
      cartGateway.validateCartForCheckout.mockResolvedValue(
        Result.success(mockCart),
      );
      addressResolver.resolve.mockReturnValue(mockResolvedAddress);

      const result = await useCase.execute({
        cartId: mockCartId,
        callerContext: SYSTEM_CALLER_CONTEXT,
        cartToken: null,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(cartGateway.validateCartForCheckout).toHaveBeenCalledWith({
        cartId: mockCartId,
        callerContext: SYSTEM_CALLER_CONTEXT,
        cartToken: null,
      });
    });
  });
});
