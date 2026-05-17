import { CurrentUser } from './current-user.decorator';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import {
  createMockExecutionContext,
  createMockRequest,
  createMockRequestWithUser,
} from '../../../../testing';

describe('CurrentUserDecorator', () => {
  function getParamDecoratorFactory(decorator: (...args: any[]) => any) {
    class Test {
      public test(@decorator() _value: any) {
        // Empty method for decorator testing
      }
    }

    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    return args[Object.keys(args)[0]].factory;
  }

  it('should extract user from request', () => {
    const factory = getParamDecoratorFactory(CurrentUser);
    const user = { userId: '123', email: 'test@example.com', role: 'customer' };
    const request = createMockRequestWithUser(user);
    const ctx = createMockExecutionContext(request);

    const result = factory(undefined, ctx);
    expect(result).toEqual(user);
  });

  it('should extract specific property from user', () => {
    const factory = getParamDecoratorFactory(CurrentUser);
    const user = { userId: '123', email: 'test@example.com', role: 'customer' };
    const request = createMockRequestWithUser(user);
    const ctx = createMockExecutionContext(request);

    const result = factory('userId', ctx);
    expect(result).toBe('123');
  });

  it('should return null if no user attached', () => {
    const factory = getParamDecoratorFactory(CurrentUser);
    const request = createMockRequestWithUser(null);
    const ctx = createMockExecutionContext(request);

    const result = factory(undefined, ctx);
    expect(result).toBeNull();
  });
});
