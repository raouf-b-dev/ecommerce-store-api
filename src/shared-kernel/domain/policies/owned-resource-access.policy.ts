import {
  CallerContext,
  isSystemCaller,
} from '../interfaces/caller-context.interface';

export interface OwnedResourcePermissions {
  viewAll: string;
  viewOwn: string;
}

export interface OwnedResourceMutationPermissions {
  manageAll: string;
  manageOwn: string;
}

export const ORDER_ACCESS_PERMISSIONS: OwnedResourcePermissions = {
  viewAll: 'view_all_orders',
  viewOwn: 'view_own_orders',
};

export const PAYMENT_ACCESS_PERMISSIONS: OwnedResourcePermissions = {
  viewAll: 'view_all_payments',
  viewOwn: 'view_own_payments',
};

export const CUSTOMER_ACCESS_PERMISSIONS: OwnedResourcePermissions = {
  viewAll: 'view_all_customers',
  viewOwn: 'view_own_profile',
};

export const CUSTOMER_MUTATION_PERMISSIONS: OwnedResourceMutationPermissions = {
  manageAll: 'manage_customers',
  manageOwn: 'manage_own_addresses',
};

export class OwnedResourceAccessPolicy {
  static canViewResource(
    callerContext: CallerContext,
    resourceCustomerId: number | null,
    permissions: OwnedResourcePermissions,
  ): boolean {
    if (resourceCustomerId === null) {
      return false;
    }

    if (isSystemCaller(callerContext)) {
      return true;
    }

    if (callerContext.permissions.has(permissions.viewAll)) {
      return true;
    }

    return (
      callerContext.permissions.has(permissions.viewOwn) &&
      callerContext.customerId !== null &&
      Number(callerContext.customerId) === Number(resourceCustomerId)
    );
  }

  static canMutateResource(
    callerContext: CallerContext,
    resourceCustomerId: number | null,
    permissions: OwnedResourceMutationPermissions,
  ): boolean {
    if (resourceCustomerId === null) {
      return false;
    }

    if (isSystemCaller(callerContext)) {
      return true;
    }

    if (callerContext.permissions.has(permissions.manageAll)) {
      return true;
    }

    return (
      callerContext.permissions.has(permissions.manageOwn) &&
      callerContext.customerId !== null &&
      Number(callerContext.customerId) === Number(resourceCustomerId)
    );
  }

  static resolveListScope(
    callerContext: CallerContext,
    permissions: OwnedResourcePermissions,
    requestedCustomerId?: number,
  ): { allowed: true; customerId: number | undefined } | { allowed: false } {
    if (isSystemCaller(callerContext)) {
      return { allowed: true, customerId: requestedCustomerId };
    }

    if (callerContext.permissions.has(permissions.viewAll)) {
      return { allowed: true, customerId: requestedCustomerId };
    }

    if (callerContext.permissions.has(permissions.viewOwn)) {
      if (callerContext.customerId === null) {
        return { allowed: false };
      }

      return { allowed: true, customerId: Number(callerContext.customerId) };
    }

    return { allowed: false };
  }
}
