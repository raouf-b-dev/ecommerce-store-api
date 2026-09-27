import { Test, TestingModule } from '@nestjs/testing';
import {
  ValidateCheckoutUseCase,
  ValidateCheckoutInput,
} from './validate-checkout.usecase';
import { ShippingAddressResolver } from '../../services/shipping-address-resolver';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ResultAssertionHelper } from '../../../../../../testing';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { SYSTEM_CALLER_CONTEXT } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { CheckoutCartInfo, CartGateway } from '../../ports/cart.gateway';
import { CheckoutUserInfoResult, UserGateway } from '../../ports/user.gateway';
import {
  MockCartGateway,
  MockShippingAddressResolver,
  MockUserGateway,
  OrderDtoTestFactory,
  OrderTestFactory,
} from 'src/modules/orders/testing';
import { AuthPayloadFactory } from 'src/testing/factories/auth-payload.factory';

describe('ValidateCheckoutUseCase', () => {
  let useCase: ValidateCheckoutUseCase;
  let userGateway: MockUserGateway;
  let cartGateway: MockCartGateway;
  let addressResolver: MockShippingAddressResolver;

  const mockuserId = 123;
  const mockCartId = 456;
  let mockUser: CheckoutUserInfoResult;

  let mockCart: CheckoutCartInfo;

  const mockResolvedAddress =
    OrderTestFactory.createMockOrder().shippingAddress;

  const customerCallerContext = AuthPayloadFactory.createCustomerContext();

  beforeEach(async () => {
    mockUser = OrderDtoTestFactory.createCheckoutUserInfoResult({
      id: mockuserId,
    });

    mockCart = OrderDtoTestFactory.createCheckoutCartInfo({
      id: mockCartId,
      userId: mockuserId,
    });

    userGateway = new MockUserGateway();
    cartGateway = new MockCartGateway();
    addressResolver = new MockShippingAddressResolver();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateCheckoutUseCase,
        { provide: UserGateway, useValue: userGateway },
        { provide: CartGateway, useValue: cartGateway },
        { provide: ShippingAddressResolver, useValue: addressResolver },
      ],
    }).compile();

    useCase = module.get<ValidateCheckoutUseCase>(ValidateCheckoutUseCase);
    userGateway = module.get(UserGateway);
    cartGateway = module.get(CartGateway);
    addressResolver = module.get(ShippingAddressResolver);
  });

  describe('successful validation', () => {
    it('should return validated context when all validations pass', async () => {
      userGateway.getUserInfo.mockResolvedValue(Result.success(mockUser));
      cartGateway.validateCartForCheckout.mockResolvedValue(
        Result.success(mockCart),
      );
      addressResolver.resolve.mockReturnValue(mockResolvedAddress);

      const input: ValidateCheckoutInput = {
        cartId: mockCartId,
        callerContext: customerCallerContext,
      };

      const result = await useCase.execute(input);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.user).toBe(mockUser);
      expect(result.value.cart).toBe(mockCart);
      expect(result.value.userId).toBe(mockuserId);
      expect(cartGateway.validateCartForCheckout).toHaveBeenCalledWith({
        cartId: mockCartId,
        callerContext: customerCallerContext,
      });
    });

    it('should call addressResolver with shippingAddress dto when provided', async () => {
      const shippingAddressDto =
        OrderDtoTestFactory.createCheckoutShippingAddressInput({
          firstName: 'Jane',
          lastName: 'Smith',
          street: '456 Other St',
          city: 'LA',
          state: 'CA',
          postalCode: '90001',
          country: 'USA',
        });

      userGateway.getUserInfo.mockResolvedValue(Result.success(mockUser));
      cartGateway.validateCartForCheckout.mockResolvedValue(
        Result.success(mockCart),
      );
      addressResolver.resolve.mockReturnValue(mockResolvedAddress);

      const input: ValidateCheckoutInput = {
        cartId: mockCartId,
        callerContext: customerCallerContext,
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
      userGateway.getUserInfo.mockResolvedValue(
        ErrorFactory.RepositoryError('Customer not found'),
      );

      const input: ValidateCheckoutInput = {
        cartId: mockCartId,
        callerContext: customerCallerContext,
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
      };

      const result = await useCase.execute(input);

      ResultAssertionHelper.assertResultFailure(result);
      expect(userGateway.getUserInfo).not.toHaveBeenCalled();
    });

    it('should return failure when cart is empty', async () => {
      cartGateway.validateCartForCheckout.mockResolvedValue(
        Result.success({ ...mockCart, items: [] }),
      );

      const input: ValidateCheckoutInput = {
        cartId: mockCartId,
        callerContext: customerCallerContext,
      };

      const result = await useCase.execute(input);

      ResultAssertionHelper.assertResultFailure(result);
    });

    it('should reject checkout when caller lacks customer account', async () => {
      const input: ValidateCheckoutInput = {
        cartId: mockCartId,
        callerContext: null,
      };

      const result = await useCase.execute(input);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Checkout requires a customer account',
      );
    });

    it('should allow system caller to revalidate during saga', async () => {
      userGateway.getUserInfo.mockResolvedValue(Result.success(mockUser));
      cartGateway.validateCartForCheckout.mockResolvedValue(
        Result.success(mockCart),
      );
      addressResolver.resolve.mockReturnValue(mockResolvedAddress);

      const result = await useCase.execute({
        cartId: mockCartId,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(cartGateway.validateCartForCheckout).toHaveBeenCalledWith({
        cartId: mockCartId,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });
    });
  });
});
