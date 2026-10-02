import { SanitizeInterceptor, sanitizeDeep } from './sanitize.interceptor';
import { CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { createMockExecutionContext } from '../testing';

describe('SanitizeInterceptor', () => {
  let interceptor: SanitizeInterceptor;

  beforeEach(() => {
    interceptor = new SanitizeInterceptor();
  });

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
    const context = createMockExecutionContext({ body });

    interceptor.intercept(context, createMockCallHandler());

    const request = context.switchToHttp().getRequest();
    expect(request.body.name).toBe('John');
    expect(request.body.email).toBe('john@example.com');
  });

  it('should strip HTML from nested object fields', () => {
    const body = {
      user: {
        name: '<b>Bold Name</b>',
        address: {
          street: '<img src=x onerror=alert(1)>123 Main St',
        },
      },
    };
    const context = createMockExecutionContext({ body });

    interceptor.intercept(context, createMockCallHandler());

    const request = context.switchToHttp().getRequest();
    expect(request.body.user.name).toBe('Bold Name');
    expect(request.body.user.address.street).toBe('123 Main St');
  });

  it('should strip HTML from array elements', () => {
    const body = {
      items: [
        '<script>alert(1)</script>Item 1',
        'Item 2',
        '<a href="evil">Item 3</a>',
      ],
    };
    const context = createMockExecutionContext({ body });

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
    const context = createMockExecutionContext({ body });

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
    const context = createMockExecutionContext({ body });

    interceptor.intercept(context, createMockCallHandler());

    const request = context.switchToHttp().getRequest();
    expect(request.body).toEqual(originalBody);
  });

  it('should handle empty body gracefully', () => {
    const context = createMockExecutionContext({});

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
    const context = createMockExecutionContext({ body });

    interceptor.intercept(context, createMockCallHandler());

    const request = context.switchToHttp().getRequest();
    expect(request.body.items[0].name).toBe('Item 1');
    expect(request.body.items[0].qty).toBe(2);
    expect(request.body.items[1].name).toBe('Item 2');
  });

  it('should not skip sanitization when URL query parameters contain /auth/ or /authentication/', () => {
    const body = {
      title: '<script>alert("xss")</script>Shoes',
      description: '<b>Nice shoes</b>',
    };
    const context = createMockExecutionContext({
      body,
      url: '/v1/products?search=/auth/&category=/authentication/',
    });

    interceptor.intercept(context, createMockCallHandler());

    const request = context.switchToHttp().getRequest();
    expect(request.body.title).toBe('Shoes');
    expect(request.body.description).toBe('Nice shoes');
  });

  it('should sanitize profile fields during registration while preserving password characters', () => {
    const body = {
      firstName: '<script>alert(1)</script>John',
      lastName: '<b>Doe</b>',
      email: 'john.doe@example.com',
      password: 'My<Complex>&SecurePassword!',
    };
    const context = createMockExecutionContext({
      body,
      url: '/v1/authentication/register',
    });

    interceptor.intercept(context, createMockCallHandler());

    const request = context.switchToHttp().getRequest();
    expect(request.body.firstName).toBe('John');
    expect(request.body.lastName).toBe('Doe');
    expect(request.body.email).toBe('john.doe@example.com');
    expect(request.body.password).toBe('My<Complex>&SecurePassword!');
  });

  it('should skip sanitization completely when Reflector detects SkipSanitization metadata', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as any;
    const customInterceptor = new SanitizeInterceptor(reflector);

    const body = {
      email: 'user@example.com',
      password: 'My<Complex>&SecurePassword!',
      rawWebhookPayload: '{"data":"<unaltered>"}',
    };
    const context = createMockExecutionContext({
      body,
      url: '/v1/authentication/login',
    });

    customInterceptor.intercept(context, createMockCallHandler());

    const request = context.switchToHttp().getRequest();
    expect(request.body.password).toBe('My<Complex>&SecurePassword!');
    expect(request.body.rawWebhookPayload).toBe('{"data":"<unaltered>"}');
    expect(reflector.getAllAndOverride).toHaveBeenCalled();
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

  it('should preserve password fields while sanitizing other object keys', () => {
    const payload = {
      name: '<script>evil()</script>Alice',
      password: 'Pass<word>&123',
      nested: {
        currentPassword: 'Old<Pass>&456',
        newPassword: 'New<Pass>&789',
        bio: '<b>Developer</b>',
      },
    };
    const result = sanitizeDeep(payload);
    expect(result.name).toBe('Alice');
    expect(result.password).toBe('Pass<word>&123');
    expect(result.nested.currentPassword).toBe('Old<Pass>&456');
    expect(result.nested.newPassword).toBe('New<Pass>&789');
    expect(result.nested.bio).toBe('Developer');
  });
});
