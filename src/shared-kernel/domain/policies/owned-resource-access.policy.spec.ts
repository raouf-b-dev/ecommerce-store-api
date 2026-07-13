import {
  SYSTEM_CALLER_CONTEXT,
  createUserCallerContext,
} from '../interfaces/caller-context.interface';
import {
  ORDER_ACCESS_PERMISSIONS,
  CUSTOMER_ACCESS_PERMISSIONS,
  CUSTOMER_MUTATION_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from './owned-resource-access.policy';

describe('OwnedResourceAccessPolicy', () => {
  describe('canViewResource', () => {
    it('allows system callers', () => {
      expect(
        OwnedResourceAccessPolicy.canViewResource(
          SYSTEM_CALLER_CONTEXT,
          999,
          ORDER_ACCESS_PERMISSIONS,
        ),
      ).toBe(true);
    });

    it('allows staff with view-all permission regardless of userId', () => {
      const admin = createUserCallerContext({
        userId: 1,
        role: 'ADMIN',
        permissions: new Set(['view_all_orders']),
      });

      expect(
        OwnedResourceAccessPolicy.canViewResource(
          admin,
          999,
          ORDER_ACCESS_PERMISSIONS,
        ),
      ).toBe(true);
    });

    it('allows customers to view their own resources', () => {
      const customer = createUserCallerContext({
        userId: 123,
        role: 'CUSTOMER',
        permissions: new Set(['view_own_orders']),
      });

      expect(
        OwnedResourceAccessPolicy.canViewResource(
          customer,
          123,
          ORDER_ACCESS_PERMISSIONS,
        ),
      ).toBe(true);
    });

    it('denies access when resource has no userId', () => {
      const customer = createUserCallerContext({
        userId: 2,
        role: 'CUSTOMER',
        permissions: new Set(['view_own_orders']),
      });

      expect(
        OwnedResourceAccessPolicy.canViewResource(
          customer,
          null,
          ORDER_ACCESS_PERMISSIONS,
        ),
      ).toBe(false);
    });

    it('denies customers viewing another customers resources', () => {
      const customer = createUserCallerContext({
        userId: 2,
        role: 'CUSTOMER',
        permissions: new Set(['view_own_orders']),
      });

      expect(
        OwnedResourceAccessPolicy.canViewResource(
          customer,
          456,
          ORDER_ACCESS_PERMISSIONS,
        ),
      ).toBe(false);
    });

    it('denies customer role with null userId even when view_own is present', () => {
      const brokenCustomer = createUserCallerContext({
        userId: null as any,
        role: 'CUSTOMER',
        permissions: new Set(['view_own_orders']),
      });

      expect(
        OwnedResourceAccessPolicy.canViewResource(
          brokenCustomer,
          123,
          ORDER_ACCESS_PERMISSIONS,
        ),
      ).toBe(false);
    });
  });

  describe('canMutateResource', () => {
    it('allows admin with manage_all permission', () => {
      const admin = createUserCallerContext({
        userId: 1,
        role: 'ADMIN',
        permissions: new Set(['manage_customers']),
      });

      expect(
        OwnedResourceAccessPolicy.canMutateResource(
          admin,
          999,
          CUSTOMER_MUTATION_PERMISSIONS,
        ),
      ).toBe(true);
    });

    it('allows customers to mutate their own resources', () => {
      const customer = createUserCallerContext({
        userId: 123,
        role: 'CUSTOMER',
        permissions: new Set(['manage_own_addresses']),
      });

      expect(
        OwnedResourceAccessPolicy.canMutateResource(
          customer,
          123,
          CUSTOMER_MUTATION_PERMISSIONS,
        ),
      ).toBe(true);
    });

    it('denies customers mutating another customers resources', () => {
      const customer = createUserCallerContext({
        userId: 2,
        role: 'CUSTOMER',
        permissions: new Set(['manage_own_addresses']),
      });

      expect(
        OwnedResourceAccessPolicy.canMutateResource(
          customer,
          456,
          CUSTOMER_MUTATION_PERMISSIONS,
        ),
      ).toBe(false);
    });

    it('denies when resource has no userId', () => {
      const customer = createUserCallerContext({
        userId: 2,
        role: 'CUSTOMER',
        permissions: new Set(['manage_own_addresses']),
      });

      expect(
        OwnedResourceAccessPolicy.canMutateResource(
          customer,
          null,
          CUSTOMER_MUTATION_PERMISSIONS,
        ),
      ).toBe(false);
    });
  });

  describe('customer view permissions', () => {
    it('allows customers to view their own profile', () => {
      const customer = createUserCallerContext({
        userId: 123,
        role: 'CUSTOMER',
        permissions: new Set(['view_own_profile']),
      });

      expect(
        OwnedResourceAccessPolicy.canViewResource(
          customer,
          123,
          CUSTOMER_ACCESS_PERMISSIONS,
        ),
      ).toBe(true);
    });
  });

  describe('resolveListScope', () => {
    it('forces customer scope and ignores tampered query params', () => {
      const customer = createUserCallerContext({
        userId: 2,
        role: 'CUSTOMER',
        permissions: new Set(['view_own_orders']),
      });

      const scope = OwnedResourceAccessPolicy.resolveListScope(
        customer,
        ORDER_ACCESS_PERMISSIONS,
        999,
      );

      expect(scope).toEqual({ allowed: true, userId: 2 });
    });

    it('denies list access when customer role has no userId', () => {
      const brokenCustomer = createUserCallerContext({
        userId: null as any,
        role: 'CUSTOMER',
        permissions: new Set(['view_own_orders']),
      });

      expect(
        OwnedResourceAccessPolicy.resolveListScope(
          brokenCustomer,
          ORDER_ACCESS_PERMISSIONS,
        ),
      ).toEqual({ allowed: false });
    });
  });
});
