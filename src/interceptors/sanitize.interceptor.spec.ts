import { SanitizeInterceptor, sanitizeDeep } from './sanitize.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('SanitizeInterceptor', () => {
  let interceptor: SanitizeInterceptor;

  beforeEach(() => {
    interceptor = new SanitizeInterceptor();
  });

  const createMockContext = (body: any): ExecutionContext => {
    const request = { body };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (): CallHandler => ({
    handle: () => of(undefined),
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should strip HTML from simple string fields', () => {
    const body = {
      name: '<script>alert("xss")</script>John',
      email: 'john@example.com',
    };
    const context = createMockContext(body);

    interceptor.intercept(context, createMockCallHandler());

    const request = context.switchToHttp().getRequest();
    expect(request.body.name).toBe('John');
    expect(request.body.email).toBe('john@example.com');
  });

  it('should strip HTML from nested object fields', () => {
    const body = {
      customer: {
        name: '<b>Bold Name</b>',
        address: {
          street: '<img src=x onerror=alert(1)>123 Main St',
        },
      },
    };
    const context = createMockContext(body);

    interceptor.intercept(context, createMockCallHandler());

    const request = context.switchToHttp().getRequest();
    expect(request.body.customer.name).toBe('Bold Name');
    expect(request.body.customer.address.street).toBe('123 Main St');
  });

  it('should strip HTML from array elements', () => {
    const body = {
      items: [
        '<script>alert(1)</script>Item 1',
        'Item 2',
        '<a href="evil">Item 3</a>',
      ],
    };
    const context = createMockContext(body);

    interceptor.intercept(context, createMockCallHandler());

    const request = context.switchToHttp().getRequest();
    expect(request.body.items).toEqual(['Item 1', 'Item 2', 'Item 3']);
  });

  it('should preserve non-string values unchanged', () => {
    const body = {
      price: 29.99,
      quantity: 5,
      active: true,
      metadata: null,
    };
    const context = createMockContext(body);

    interceptor.intercept(context, createMockCallHandler());

    const request = context.switchToHttp().getRequest();
    expect(request.body.price).toBe(29.99);
    expect(request.body.quantity).toBe(5);
    expect(request.body.active).toBe(true);
    expect(request.body.metadata).toBeNull();
  });

  it('should not modify already-clean input', () => {
    const body = {
      name: 'John Doe',
      email: 'john@example.com',
      description: 'A normal product description.',
    };
    const originalBody = { ...body };
    const context = createMockContext(body);

    interceptor.intercept(context, createMockCallHandler());

    const request = context.switchToHttp().getRequest();
    expect(request.body).toEqual(originalBody);
  });

  it('should handle empty body gracefully', () => {
    const context = createMockContext(undefined);

    expect(() => {
      interceptor.intercept(context, createMockCallHandler());
    }).not.toThrow();
  });

  it('should handle arrays of objects', () => {
    const body = {
      items: [
        { name: '<b>Item 1</b>', qty: 2 },
        { name: 'Item 2', qty: 3 },
      ],
    };
    const context = createMockContext(body);

    interceptor.intercept(context, createMockCallHandler());

    const request = context.switchToHttp().getRequest();
    expect(request.body.items[0].name).toBe('Item 1');
    expect(request.body.items[0].qty).toBe(2);
    expect(request.body.items[1].name).toBe('Item 2');
  });
});

describe('sanitizeDeep', () => {
  it('should sanitize a plain string', () => {
    expect(sanitizeDeep('<script>alert(1)</script>hello')).toBe('hello');
  });

  it('should return numbers unchanged', () => {
    expect(sanitizeDeep(42)).toBe(42);
  });

  it('should return booleans unchanged', () => {
    expect(sanitizeDeep(true)).toBe(true);
  });

  it('should return null unchanged', () => {
    expect(sanitizeDeep(null)).toBeNull();
  });

  it('should return undefined unchanged', () => {
    expect(sanitizeDeep(undefined)).toBeUndefined();
  });
});
