import { CartOwnershipValidator } from './cart-ownership.validator';
import { Cart } from '../../domain/entities/cart';
import {
  createUserCallerContext,
  SYSTEM_CALLER_CONTEXT,
} from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { AuthPayloadFactory } from 'src/testing/factories/auth-payload.factory';
import { ErrorCode } from '../../../../../shared-kernel/domain/exceptions/error-code';
import { ErrorKind } from '../../../../../shared-kernel/domain/exceptions/error-kind';
import { ResultAssertionHelper } from '../../../../../testing';

describe('CartOwnershipValidator', () => {
  let validator: CartOwnershipValidator;

  beforeEach(() => {
    validator = new CartOwnershipValidator();
  });

  describe('validate', () => {
    it('should allow system caller', () => {
      const cart = Cart.createUserCart(123);
      const result = validator.validate(cart, SYSTEM_CALLER_CONTEXT);
      expect(result.isSuccess).toBe(true);
    });

    it('should allow admin with manage_carts permission', () => {
      const cart = Cart.createUserCart(123);
      const callerContext = AuthPayloadFactory.createAdminContext({
        userId: 1,
      });

      const result = validator.validate(cart, callerContext);
      expect(result.isSuccess).toBe(true);
    });

    it('should allow user owning the cart with manage_own_cart permission', () => {
      const cart = Cart.createUserCart(123);
      const callerContext = AuthPayloadFactory.createCustomerContext();

      const result = validator.validate(cart, callerContext);
      expect(result.isSuccess).toBe(true);
    });

    it('should deny user owning the cart but missing manage_own_cart permission', () => {
      const cart = Cart.createUserCart(123);
      const callerContext = createUserCallerContext({
        userId: 123,
        role: 'CUSTOMER',
        permissions: new Set([]),
      });

      const result = validator.validate(cart, callerContext);
      ResultAssertionHelper.assertResultFailure(result);
      expect(result.error.code).toBe(ErrorCode.CART_NOT_FOUND);
      expect(result.error.kind).toBe(ErrorKind.NOT_FOUND);
    });

    it('should deny user with mismatched userId', () => {
      const cart = Cart.createUserCart(123);
      const callerContext = createUserCallerContext({
        userId: 1,
        role: 'CUSTOMER',
        permissions: new Set(['manage_own_cart']),
      });

      const result = validator.validate(cart, callerContext);
      ResultAssertionHelper.assertResultFailure(result);
      expect(result.error.code).toBe(ErrorCode.CART_NOT_FOUND);
      expect(result.error.kind).toBe(ErrorKind.NOT_FOUND);
    });

    it('should deny user cart access when caller context is null', () => {
      const cart = Cart.createUserCart(123);
      const result = validator.validate(cart, null);
      ResultAssertionHelper.assertResultFailure(result);
      expect(result.error.code).toBe(ErrorCode.CART_NOT_FOUND);
      expect(result.error.kind).toBe(ErrorKind.NOT_FOUND);
    });
  });
});
