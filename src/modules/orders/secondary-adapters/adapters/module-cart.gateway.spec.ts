import { Test } from '@nestjs/testing';
import { ModuleCartGateway } from './module-cart.gateway';
import { GetCartUseCase } from '../../../carts/core/application/usecases/get-cart/get-cart.usecase';
import { ClearCartUseCase } from '../../../carts/core/application/usecases/clear-cart/clear-cart.usecase';
import { Result } from '../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { SYSTEM_CALLER_CONTEXT } from '../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { ResultAssertionHelper } from '../../../../testing';
import { CartDtoTestFactory } from '../../../carts/testing';

describe('ModuleCartGateway', () => {
  let gateway: ModuleCartGateway;
  let mockGetCartExecute: jest.MockedFunction<GetCartUseCase['execute']>;
  let mockClearCartExecute: jest.MockedFunction<ClearCartUseCase['execute']>;

  beforeEach(async () => {
    mockGetCartExecute = jest.fn();
    mockClearCartExecute = jest.fn();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ModuleCartGateway,
        {
          provide: GetCartUseCase,
          useValue: { execute: mockGetCartExecute },
        },
        {
          provide: ClearCartUseCase,
          useValue: { execute: mockClearCartExecute },
        },
      ],
    }).compile();

    gateway = moduleRef.get(ModuleCartGateway);
  });

  describe('validateCart', () => {
    it('returns checkout cart info with prices converted to minor units on success', async () => {
      const cartDto = CartDtoTestFactory.createCartPresentationDTO({
        id: 42,
        userId: 10,
        items: [
          {
            id: 100,
            productId: 5,
            productName: 'Mechanical Keyboard',
            price: 89.99,
            currency: 'USD',
            quantity: 2,
            subtotal: 179.98,
            imageUrl: 'https://example.com/keyboard.jpg',
          },
        ],
      });

      mockGetCartExecute.mockResolvedValue(Result.success(cartDto));

      const result = await gateway.validateCart(42);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockGetCartExecute).toHaveBeenCalledWith({
        cartId: 42,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });
      expect(result.value).toEqual({
        id: 42,
        userId: 10,
        items: [
          {
            productId: 5,
            productName: 'Mechanical Keyboard',
            imageUrl: 'https://example.com/keyboard.jpg',
            price: 8999,
            quantity: 2,
            currency: 'USD',
          },
        ],
      });
    });

    it('returns infrastructure error when getCartUseCase fails', async () => {
      mockGetCartExecute.mockResolvedValue(
        ErrorFactory.UseCaseError('Cart not found'),
      );

      const result = await gateway.validateCart(42);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to validate cart',
      );
    });

    it('returns infrastructure error when cart item has empty currency', async () => {
      const cartDto = CartDtoTestFactory.createCartPresentationDTO({
        id: 42,
        userId: 10,
        items: [
          {
            id: 100,
            productId: 5,
            productName: 'Mechanical Keyboard',
            price: 89.99,
            currency: '',
            quantity: 2,
            subtotal: 179.98,
            imageUrl: null,
          },
        ],
      });

      mockGetCartExecute.mockResolvedValue(Result.success(cartDto));

      const result = await gateway.validateCart(42);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Cart item "Mechanical Keyboard" is missing a currency',
      );
    });

    it('returns infrastructure error when cart item has invalid currency code', async () => {
      const cartDto = CartDtoTestFactory.createCartPresentationDTO({
        id: 42,
        userId: 10,
        items: [
          {
            id: 100,
            productId: 5,
            productName: 'Mechanical Keyboard',
            price: 89.99,
            currency: 'INVALID',
            quantity: 2,
            subtotal: 179.98,
            imageUrl: null,
          },
        ],
      });

      mockGetCartExecute.mockResolvedValue(Result.success(cartDto));

      const result = await gateway.validateCart(42);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Invalid money for cart item "Mechanical Keyboard"',
      );
    });
  });

  describe('validateCartForCheckout', () => {
    it('passes caller context and returns converted cart info on success', async () => {
      const cartDto = CartDtoTestFactory.createCartPresentationDTO({
        id: 42,
        userId: 10,
        items: [
          {
            id: 101,
            productId: 6,
            productName: 'Mousepad',
            price: 15.5,
            currency: 'USD',
            quantity: 1,
            subtotal: 15.5,
            imageUrl: null,
          },
        ],
      });

      mockGetCartExecute.mockResolvedValue(Result.success(cartDto));

      const result = await gateway.validateCartForCheckout({
        cartId: 42,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.items[0].price).toBe(1550);
    });

    it('passes through use case error when getCartUseCase fails', async () => {
      mockGetCartExecute.mockResolvedValue(
        ErrorFactory.UseCaseError('Access denied'),
      );

      const result = await gateway.validateCartForCheckout({
        cartId: 42,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });

      ResultAssertionHelper.assertResultFailure(result, 'Access denied');
    });
  });

  describe('getCart', () => {
    it('translates cart info on success', async () => {
      const cartDto = CartDtoTestFactory.createCartPresentationDTO({
        id: 1,
        userId: 5,
        items: [],
      });

      mockGetCartExecute.mockResolvedValue(Result.success(cartDto));

      const result = await gateway.getCart(1);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(1);
      expect(result.value.items).toEqual([]);
    });

    it('returns infrastructure error on failure', async () => {
      mockGetCartExecute.mockResolvedValue(
        ErrorFactory.UseCaseError('Database error'),
      );

      const result = await gateway.getCart(1);

      ResultAssertionHelper.assertResultFailure(result, 'Failed to get cart');
    });
  });

  describe('clearCart', () => {
    it('returns success when clearCartUseCase succeeds', async () => {
      mockClearCartExecute.mockResolvedValue(Result.success(undefined));

      const result = await gateway.clearCart(42);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockClearCartExecute).toHaveBeenCalledWith({
        cartId: 42,
        callerContext: SYSTEM_CALLER_CONTEXT,
      });
    });

    it('returns infrastructure error when clearCartUseCase fails', async () => {
      mockClearCartExecute.mockResolvedValue(
        ErrorFactory.UseCaseError('Clear failed'),
      );

      const result = await gateway.clearCart(42);

      ResultAssertionHelper.assertResultFailure(result, 'Failed to clear cart');
    });
  });
});
