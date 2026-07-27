import { of } from 'rxjs';
import { CartSessionCookieInterceptor } from './cart-session-cookie.interceptor';
import { Result } from '../../../../shared-kernel/domain/result';

describe('CartSessionCookieInterceptor', () => {
  it('sets the cart session cookie when a guest cart token is created', (done) => {
    const mockConfigService = {
      jwt: { cartSessionTtl: '7d' },
    } as any;

    const interceptor = new CartSessionCookieInterceptor(mockConfigService);
    const mockResponse = { cookie: jest.fn(), setHeader: jest.fn() };
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ route: { path: '/carts' } }),
        getResponse: () => mockResponse,
      }),
    } as any;

    interceptor
      .intercept(mockContext, {
        handle: () =>
          of(
            Result.success({
              cart: { id: 1 },
              token: 'guest-token',
            }),
          ),
      })
      .subscribe((result) => {
        expect(result.isSuccess).toBe(true);
        expect(mockResponse.cookie).toHaveBeenCalledWith(
          'cart_session_token',
          'guest-token',
          expect.objectContaining({
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
          }),
        );
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'x-cart-token',
          'guest-token',
        );
        done();
      });
  });
});
