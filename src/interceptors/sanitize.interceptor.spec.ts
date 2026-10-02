import { CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import {
  SanitizeInterceptor,
  SKIP_SANITIZATION_KEY,
  sanitizeDeep,
} from './sanitize.interceptor';
import { AuthenticationController } from '../modules/authentication/authentication.controller';
import { PaymentsController } from '../modules/payments/payments.controller';
import { RolesController } from '../modules/authorization/roles.controller';
import { createMockExecutionContext } from '../testing';

describe('SanitizeInterceptor', () => {
  const reflector = new Reflector();
  let interceptor: SanitizeInterceptor;

  beforeEach(() => {
    interceptor = new SanitizeInterceptor(reflector);
  });

  const createMockCallHandler = (): CallHandler => ({
    handle: () => of(undefined),
  });

  describe('handler metadata reflection', () => {
    it('sets SkipSanitization on AuthenticationController.prototype.login', () => {
      const isSkipped = reflector.get<boolean>(
        SKIP_SANITIZATION_KEY,
        AuthenticationController.prototype.login,
      );
      expect(isSkipped).toBe(true);
    });

    it('does not set SkipSanitization on AuthenticationController.prototype.register', () => {
      const isSkipped = reflector.get<boolean>(
        SKIP_SANITIZATION_KEY,
        AuthenticationController.prototype.register,
      );
      expect(isSkipped).toBeUndefined();
    });

    it('sets SkipSanitization on PaymentsController.prototype.handleStripeWebhook', () => {
      const isSkipped = reflector.get<boolean>(
        SKIP_SANITIZATION_KEY,
        PaymentsController.prototype.handleStripeWebhook,
      );
      expect(isSkipped).toBe(true);
    });

    it('does not set SkipSanitization on RolesController.prototype.create', () => {
      const isSkipped = reflector.get<boolean>(
        SKIP_SANITIZATION_KEY,
        RolesController.prototype.create,
      );
      expect(isSkipped).toBeUndefined();
    });
  });

  describe('interception with real controller contexts and Reflector', () => {
    it('skips sanitization on login so credentials with < > & are preserved intact', () => {
      const body = {
        email: 'user@example.com',
        password: 'P@ss<word>&123',
      };
      const context = createMockExecutionContext({ body });
      context.getHandler.mockReturnValue(
        AuthenticationController.prototype.login,
      );
      context.getClass.mockReturnValue(AuthenticationController);

      interceptor.intercept(context, createMockCallHandler());

      const request = context.switchToHttp().getRequest();
      expect(request.body.password).toBe('P@ss<word>&123');
      expect(request.body.email).toBe('user@example.com');
    });

    it('sanitizes registration input since register has no skip decorator', () => {
      const body = {
        firstName: '<script>alert("xss")</script>Jane',
        lastName: '<b>Doe</b>',
        email: 'jane@example.com',
      };
      const context = createMockExecutionContext({ body });
      context.getHandler.mockReturnValue(
        AuthenticationController.prototype.register,
      );
      context.getClass.mockReturnValue(AuthenticationController);

      interceptor.intercept(context, createMockCallHandler());

      const request = context.switchToHttp().getRequest();
      expect(request.body.firstName).toBe('Jane');
      expect(request.body.lastName).toBe('Doe');
      expect(request.body.email).toBe('jane@example.com');
    });

    it('skips sanitization on stripe webhook handler leaving the body untouched', () => {
      const body = {
        id: 'evt_test_123',
        type: 'payment_intent.created',
        data: {
          object: {
            id: 'pi_test',
            description:
              '<script>alert("xss")</script> Raw & Untouched Payload',
          },
        },
      };
      const context = createMockExecutionContext({ body });
      context.getHandler.mockReturnValue(
        PaymentsController.prototype.handleStripeWebhook,
      );
      context.getClass.mockReturnValue(PaymentsController);

      interceptor.intercept(context, createMockCallHandler());

      const request = context.switchToHttp().getRequest();
      expect(request.body.data.object.description).toBe(
        '<script>alert("xss")</script> Raw & Untouched Payload',
      );
    });

    it('sanitizes authorization role management endpoints', () => {
      const body = {
        code: 'CUSTOM_ROLE',
        name: '<script>alert(1)</script>Role Manager',
        description: '<b>Custom permissions</b>',
      };
      const context = createMockExecutionContext({ body });
      context.getHandler.mockReturnValue(RolesController.prototype.create);
      context.getClass.mockReturnValue(RolesController);

      interceptor.intercept(context, createMockCallHandler());

      const request = context.switchToHttp().getRequest();
      expect(request.body.code).toBe('CUSTOM_ROLE');
      expect(request.body.name).toBe('Role Manager');
      expect(request.body.description).toBe('Custom permissions');
    });
  });

  describe('data sanitization functionality', () => {
    it('strips HTML from simple string fields', () => {
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

    it('strips HTML from nested object fields', () => {
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

    it('strips HTML from array elements', () => {
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

    it('preserves non-string values unchanged', () => {
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

    it('does not modify already-clean input', () => {
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

    it('handles empty body gracefully', () => {
      const context = createMockExecutionContext({});

      expect(() => {
        interceptor.intercept(context, createMockCallHandler());
      }).not.toThrow();
    });

    it('handles arrays of objects', () => {
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
  });

  describe('sanitizeDeep', () => {
    it('sanitizes a plain string', () => {
      expect(sanitizeDeep('<script>alert(1)</script>hello')).toBe('hello');
    });

    it('returns numbers unchanged', () => {
      expect(sanitizeDeep(42)).toBe(42);
    });

    it('returns booleans unchanged', () => {
      expect(sanitizeDeep(true)).toBe(true);
    });

    it('returns null unchanged', () => {
      expect(sanitizeDeep(null)).toBeNull();
    });

    it('returns undefined unchanged', () => {
      expect(sanitizeDeep(undefined)).toBeUndefined();
    });

    it('recursively strips HTML in nested objects and arrays', () => {
      const payload = {
        title: '<script>evil()</script>Item',
        tags: ['<b>tag1</b>', 'tag2'],
        details: {
          note: '<img src=x onerror=alert(1)>Important',
          count: 10,
        },
      };
      const result = sanitizeDeep(payload);
      expect(result.title).toBe('Item');
      expect(result.tags).toEqual(['tag1', 'tag2']);
      expect(result.details.note).toBe('Important');
      expect(result.details.count).toBe(10);
    });
  });
});
