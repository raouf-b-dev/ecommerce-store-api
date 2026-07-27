import { CartOwnershipValidator } from './cart-ownership.validator';
import { CartSessionTokenGateway } from '../ports/session-token.gateway';
import { Cart } from '../../domain/entities/cart';
import { Result } from '../../../../../shared-kernel/domain/result';
import {
  CallerContext,
  SYSTEM_CALLER_CONTEXT,
} from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';

describe('CartOwnershipValidator', () => {
  let validator: CartOwnershipValidator;
  let mockSessionTokenGateway: jest.Mocked<CartSessionTokenGateway>;

  beforeEach(() => {
    mockSessionTokenGateway = {
      generateToken: jest.fn(),
      validateToken: jest.fn(),
    } as any;

    validator = new CartOwnershipValidator(mockSessionTokenGateway);
  });

  describe('validate', () => {
    it('should allow admin with manage_carts permission', async () => {
      const cart = Cart.createUserCart(123);
      const callerContext: CallerContext = {
        kind: 'user',
        userId: 1,
        role: 'ADMIN',
        permissions: new Set(['manage_carts']),
      };

      const result = await validator.validate(cart, callerContext, null);
      expect(result.isSuccess).toBe(true);
    });

    it('should allow user owning the cart with manage_own_cart permission', async () => {
      const cart = Cart.createUserCart(123);
      const callerContext: CallerContext = {
        kind: 'user',
        userId: 123,
        role: 'CUSTOMER',
        permissions: new Set(['manage_own_cart']),
      };

      const result = await validator.validate(cart, callerContext, null);
      expect(result.isSuccess).toBe(true);
    });

    it('should deny user owning the cart but missing manage_own_cart permission', async () => {
      const cart = Cart.createUserCart(123);
      const callerContext: CallerContext = {
        kind: 'user',
        userId: 123,
        role: 'CUSTOMER',
        permissions: new Set([]), // missing permission
      };

      const result = await validator.validate(cart, callerContext, null);
      expect(result.isFailure).toBe(true);
    });

    it('should deny user with mismatched userId', async () => {
      const cart = Cart.createUserCart(123);
      const callerContext: CallerContext = {
        kind: 'user',
        userId: 1,
        role: 'CUSTOMER',
        permissions: new Set(['manage_own_cart']),
      };

      const result = await validator.validate(cart, callerContext, null);
      expect(result.isFailure).toBe(true);
    });

    it('should deny user cart access when caller context is null', async () => {
      const cart = Cart.createUserCart(123);
      const result = await validator.validate(cart, null, null);
      expect(result.isFailure).toBe(true);
    });

    it('should allow system caller without cart token', async () => {
      const cart = Cart.createGuestCart(123);
      Object.defineProperty(cart, 'id', { value: 789 });

      const result = await validator.validate(
        cart,
        SYSTEM_CALLER_CONTEXT,
        null,
      );
      expect(result.isSuccess).toBe(true);
      expect(mockSessionTokenGateway.validateToken).not.toHaveBeenCalled();
    });

    it('should deny guest cart when logged-in user has no session token', async () => {
      const cart = Cart.createGuestCart(123);
      Object.defineProperty(cart, 'id', { value: 789 });

      const callerContext: CallerContext = {
        kind: 'user',
        userId: 2,
        role: 'CUSTOMER',
        permissions: new Set(['manage_own_cart']),
      };

      const result = await validator.validate(cart, callerContext, null);
      expect(result.isFailure).toBe(true);
      expect(mockSessionTokenGateway.validateToken).not.toHaveBeenCalled();
    });

    it('should allow guest cart when logged-in user presents a valid session token', async () => {
      const cart = Cart.createGuestCart(123);
      Object.defineProperty(cart, 'id', { value: 789 });

      mockSessionTokenGateway.validateToken.mockResolvedValue(
        Result.success(true),
      );

      const callerContext: CallerContext = {
        kind: 'user',
        userId: 2,
        role: 'CUSTOMER',
        permissions: new Set(['manage_own_cart']),
      };

      const result = await validator.validate(
        cart,
        callerContext,
        'valid-token',
      );
      expect(result.isSuccess).toBe(true);
      expect(mockSessionTokenGateway.validateToken).toHaveBeenCalledWith(
        'valid-token',
        789,
      );
    });

    it('should deny guest cart token on user carts even when user is authenticated', async () => {
      const cart = Cart.createUserCart(123);
      mockSessionTokenGateway.validateToken.mockResolvedValue(
        Result.success(true),
      );

      const callerContext: CallerContext = {
        kind: 'user',
        userId: 2,
        role: 'CUSTOMER',
        permissions: new Set(['manage_own_cart']),
      };

      const result = await validator.validate(
        cart,
        callerContext,
        'guest-token-for-wrong-cart-type',
      );
      expect(result.isFailure).toBe(true);
      expect(mockSessionTokenGateway.validateToken).not.toHaveBeenCalled();
    });

    it('should allow guest cart with valid token', async () => {
      const cart = Cart.createGuestCart(123);
      Object.defineProperty(cart, 'id', { value: 789 });

      mockSessionTokenGateway.validateToken.mockResolvedValue(
        Result.success(true),
      );

      const result = await validator.validate(cart, null, 'valid-token');
      expect(result.isSuccess).toBe(true);
      expect(mockSessionTokenGateway.validateToken).toHaveBeenCalledWith(
        'valid-token',
        789,
      );
    });

    it('should deny guest cart with invalid token', async () => {
      const cart = Cart.createGuestCart(123);
      Object.defineProperty(cart, 'id', { value: 789 });

      mockSessionTokenGateway.validateToken.mockResolvedValue(
        Result.success(false),
      );

      const result = await validator.validate(cart, null, 'invalid-token');
      expect(result.isFailure).toBe(true);
    });

    it('should deny guest cart when token is missing', async () => {
      const cart = Cart.createGuestCart(123);
      Object.defineProperty(cart, 'id', { value: 789 });

      const result = await validator.validate(cart, null, null);
      expect(result.isFailure).toBe(true);
    });
  });
});
