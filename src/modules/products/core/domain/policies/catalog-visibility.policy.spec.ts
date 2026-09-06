import { createUserCallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  CatalogVisibilityPolicy,
  VIEW_ALL_PRODUCTS_PERMISSION,
} from './catalog-visibility.policy';

describe('CatalogVisibilityPolicy', () => {
  const operator = createUserCallerContext({
    userId: 1,
    role: 'ADMIN',
    permissions: new Set([VIEW_ALL_PRODUCTS_PERMISSION]),
  });
  const customer = createUserCallerContext({
    userId: 2,
    role: 'CUSTOMER',
    permissions: new Set(['manage_own_cart']),
  });

  describe('canViewInactive', () => {
    it.each([
      ['anonymous', null, false],
      ['customer', customer, false],
      ['operator with view_all_products', operator, true],
    ] as const)('%s', (_label, caller, expected) => {
      expect(CatalogVisibilityPolicy.canViewInactive(caller)).toBe(expected);
    });
  });

  describe('constrainListFilter', () => {
    it('forces isActive true for shoppers even when they request inactive', () => {
      expect(
        CatalogVisibilityPolicy.constrainListFilter(
          { isActive: false, search: 'laptop' },
          customer,
        ),
      ).toEqual({ isActive: true, search: 'laptop' });
    });

    it('leaves operator filters unchanged', () => {
      const query = { isActive: false, page: 2 };
      expect(
        CatalogVisibilityPolicy.constrainListFilter(query, operator),
      ).toEqual(query);
    });

    it('forces isActive true when anonymous omits the filter', () => {
      expect(CatalogVisibilityPolicy.constrainListFilter({}, null)).toEqual({
        isActive: true,
      });
    });
  });

  describe('isVisible', () => {
    it.each([
      ['active + anonymous', true, null, true],
      ['inactive + anonymous', false, null, false],
      ['inactive + customer', false, customer, false],
      ['inactive + operator', false, operator, true],
    ] as const)('%s', (_label, isActive, caller, expected) => {
      expect(CatalogVisibilityPolicy.isVisible(isActive, caller)).toBe(
        expected,
      );
    });
  });
});
