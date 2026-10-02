import {
  SanitizeInterceptor,
  SkipSanitization,
  sanitizeDeep,
} from './sanitize.interceptor';
import { CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { createMockExecutionContext } from '../testing';

describe('SanitizeInterceptor', () => {
  let interceptor: SanitizeInterceptor;
  let mockReflector: Reflector;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    interceptor = new SanitizeInterceptor(mockReflector);
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

  it('should not bypass sanitization on arbitrary routes when ?x=/auth/ is passed (negative case)', () => {
    const body = {
      title: '<script>alert("xss")</script>Shoes',
      description: '<b>Nice shoes</b>',
    };
    const context = createMockExecutionContext({
      body,
      url: '/v1/products?x=/auth/',
    });

    interceptor.intercept(context, createMockCallHandler());

    const request = context.switchToHttp().getRequest();
    expect(request.body.title).toBe('Shoes');
    expect(request.body.description).toBe('Nice shoes');
  });

  it('should sanitize registration fields (firstName, lastName, phone) while preserving password characters', () => {
    const body = {
      firstName: '<script>alert("xss")</script>Jane',
      lastName: '<b>Doe</b>',
      phone: '<script>evil()</script>+15551234567',
      password: 'My<Complex>&SecurePassword!',
    };
    const context = createMockExecutionContext({
      body,
      url: '/v1/authentication/register',
    });

    interceptor.intercept(context, createMockCallHandler());

    const request = context.switchToHttp().getRequest();
    expect(request.body.firstName).toBe('Jane');
    expect(request.body.lastName).toBe('Doe');
    expect(request.body.phone).toBe('+15551234567');
    expect(request.body.password).toBe('My<Complex>&SecurePassword!');
  });

  it('should allow passwords containing < > & to survive unaltered on login with @SkipSanitization()', () => {
    (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

    const body = {
      email: 'user@example.com',
      password: 'P@ss<word>&123',
    };
    const context = createMockExecutionContext({
      body,
      url: '/v1/authentication/login',
    });

    interceptor.intercept(context, createMockCallHandler());

    const request = context.switchToHttp().getRequest();
    expect(request.body.password).toBe('P@ss<word>&123');
    expect(request.body.email).toBe('user@example.com');
  });

  it('should recognize @SkipSanitization() decorator on a real controller handler using real Reflector', () => {
    class TestController {
      @SkipSanitization()
      loginHandler() {
        return 'ok';
      }

      standardHandler() {
        return 'ok';
      }
    }

    const realReflector = new Reflector();
    const realInterceptor = new SanitizeInterceptor(realReflector);

    const instance = new TestController();
    const loginReq = { body: { password: 'P@ss<word>&123' } };
    const loginContext = {
      getType: () => 'http',
      getHandler: () => instance.loginHandler,
      getClass: () => TestController,
      switchToHttp: () => ({
        getRequest: () => loginReq,
      }),
    } as any;

    realInterceptor.intercept(loginContext, createMockCallHandler());
    expect(loginReq.body.password).toBe('P@ss<word>&123');

    const standardReq = { body: { name: '<b>Alice</b>' } };
    const standardContext = {
      getType: () => 'http',
      getHandler: () => instance.standardHandler,
      getClass: () => TestController,
      switchToHttp: () => ({
        getRequest: () => standardReq,
      }),
    } as any;

    realInterceptor.intercept(standardContext, createMockCallHandler());
    expect(standardReq.body.name).toBe('Alice');
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
