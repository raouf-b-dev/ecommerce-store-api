import { CartOwnershipValidator } from './cart-ownership.validator';
import { Cart } from '../../domain/entities/cart';
import {
  CallerContext,
  SYSTEM_CALLER_CONTEXT,
} from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';

describe('CartOwnershipValidator', () => {
  let validator: CartOwnershipValidator;

  beforeEach(() => {
    validator = new CartOwnershipValidator();
  });

  describe('validate', () => {
    it('should allow system caller', async () => {
      const cart = Cart.createUserCart(123);
      const result = await validator.validate(cart, SYSTEM_CALLER_CONTEXT);
      expect(result.isSuccess).toBe(true);
    });

    it('should allow admin with manage_carts permission', async () => {
      const cart = Cart.createUserCart(123);
      const callerContext: CallerContext = {
        kind: 'user',
        userId: 1,
        role: 'ADMIN',
        permissions: new Set(['manage_carts']),
      };

      const result = await validator.validate(cart, callerContext);
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

      const result = await validator.validate(cart, callerContext);
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

      const result = await validator.validate(cart, callerContext);
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

      const result = await validator.validate(cart, callerContext);
      expect(result.isFailure).toBe(true);
    });

    it('should deny user cart access when caller context is null', async () => {
      const cart = Cart.createUserCart(123);
      const result = await validator.validate(cart, null);
      expect(result.isFailure).toBe(true);
    });
  });
});
