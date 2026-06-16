import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { ExecutionContext } from '@nestjs/common';
import { CartToken } from './cart-token.decorator';
import {
  CART_SESSION_COOKIE_NAME,
  CART_SESSION_HEADER_NAME,
} from '../constants/cart-session.constants';

describe('CartToken decorator', () => {
  function getParamDecoratorFactory(decorator: (...args: any[]) => any) {
    class Test {
      public test(@decorator() _value: any) {
        return _value;
      }
    }

    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    return args[Object.keys(args)[0]].factory;
  }

  const factory = getParamDecoratorFactory(CartToken);

  const createContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  it('prefers the x-cart-token header for mobile clients', () => {
    const token = factory(
      undefined,
      createContext({
        headers: { [CART_SESSION_HEADER_NAME]: 'header-token' },
        cookies: { [CART_SESSION_COOKIE_NAME]: 'cookie-token' },
      }),
    );

    expect(token).toBe('header-token');
  });

  it('falls back to the HttpOnly cookie for web clients', () => {
    const token = factory(
      undefined,
      createContext({
        headers: {},
        cookies: { [CART_SESSION_COOKIE_NAME]: 'cookie-token' },
      }),
    );

    expect(token).toBe('cookie-token');
  });

  it('returns null when no token is present', () => {
    const token = factory(
      undefined,
      createContext({ headers: {}, cookies: {} }),
    );

    expect(token).toBeNull();
  });
});
