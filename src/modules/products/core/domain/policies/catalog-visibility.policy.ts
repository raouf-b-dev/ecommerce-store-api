import { CallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';

export const VIEW_ALL_PRODUCTS_PERMISSION = 'view_all_products';

export class CatalogVisibilityPolicy {
  static canViewInactive(caller: CallerContext | null | undefined): boolean {
    return caller?.permissions.has(VIEW_ALL_PRODUCTS_PERMISSION) === true;
  }

  static constrainListFilter<T extends { isActive?: boolean }>(
    query: T,
    caller: CallerContext | null | undefined,
  ): T {
    if (this.canViewInactive(caller)) {
      return query;
    }
    return { ...query, isActive: true };
  }

  static isVisible(
    isActive: boolean,
    caller: CallerContext | null | undefined,
  ): boolean {
    return isActive || this.canViewInactive(caller);
  }
}
