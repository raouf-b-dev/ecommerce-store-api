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

export const USER_ACCESS_PERMISSIONS: OwnedResourcePermissions = {
  viewAll: 'view_all_users',
  viewOwn: 'view_own_profile',
};

export const USER_MUTATION_PERMISSIONS: OwnedResourceMutationPermissions = {
  manageAll: 'manage_users',
  manageOwn: 'manage_own_addresses',
};

export class OwnedResourceAccessPolicy {
  static canViewResource(
    callerContext: CallerContext,
    resourceUserId: number | null,
    permissions: OwnedResourcePermissions,
  ): boolean {
    if (resourceUserId === null) {
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
      Boolean(callerContext.userId) &&
      Number(callerContext.userId) === Number(resourceUserId)
    );
  }

  static canMutateResource(
    callerContext: CallerContext,
    resourceUserId: number | null,
    permissions: OwnedResourceMutationPermissions,
  ): boolean {
    if (resourceUserId === null) {
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
      Boolean(callerContext.userId) &&
      Number(callerContext.userId) === Number(resourceUserId)
    );
  }

  static resolveListScope(
    callerContext: CallerContext,
    permissions: OwnedResourcePermissions,
    requestedUserId?: number,
  ): { allowed: true; userId: number | undefined } | { allowed: false } {
    if (isSystemCaller(callerContext)) {
      return { allowed: true, userId: requestedUserId };
    }

    if (callerContext.permissions.has(permissions.viewAll)) {
      return { allowed: true, userId: requestedUserId };
    }

    if (callerContext.permissions.has(permissions.viewOwn)) {
      if (!callerContext.userId) {
        return { allowed: false };
      }

      return {
        allowed: true,
        userId: Number(callerContext.userId),
      };
    }

    return { allowed: false };
  }

  static resolveResourceScope(
    callerContext: CallerContext,
    permissions: OwnedResourcePermissions,
  ):
    | { allowed: true; authorizedUserId: number | undefined }
    | { allowed: false } {
    if (isSystemCaller(callerContext)) {
      return { allowed: true, authorizedUserId: undefined };
    }

    if (callerContext.permissions.has(permissions.viewAll)) {
      return { allowed: true, authorizedUserId: undefined };
    }

    if (callerContext.permissions.has(permissions.viewOwn)) {
      if (!callerContext.userId) {
        return { allowed: false };
      }
      return { allowed: true, authorizedUserId: Number(callerContext.userId) };
    }

    return { allowed: false };
  }
}
