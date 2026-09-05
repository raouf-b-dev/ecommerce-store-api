import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { ResultAssertionHelper } from '../../../../../testing';
import { Category } from './category';

describe('Category', () => {
  describe('construction', () => {
    it('rejects empty name', () => {
      expect(
        () =>
          new Category({
            id: 1,
            name: '   ',
          }),
      ).toThrow(DomainError);
    });

    it('generates slug from name', () => {
      const category = Category.create({ name: 'Home & Garden' });

      expect(category.slug).toBe('home-garden');
      expect(category.isActive).toBe(true);
    });
  });

  describe('activate and deactivate', () => {
    it('toggles isActive flag', () => {
      const category = Category.create({ name: 'Electronics', isActive: true });

      ResultAssertionHelper.assertResultSuccess(category.deactivate());
      expect(category.isActive).toBe(false);

      ResultAssertionHelper.assertResultSuccess(category.activate());
      expect(category.isActive).toBe(true);
    });

    it('rejects activate when already active', () => {
      const category = Category.create({ name: 'Electronics' });

      ResultAssertionHelper.assertResultFailure(
        category.activate(),
        'Category is already active',
        DomainError,
      );
    });

    it('rejects deactivate when already inactive', () => {
      const category = Category.create({
        name: 'Electronics',
        isActive: false,
      });

      ResultAssertionHelper.assertResultFailure(
        category.deactivate(),
        'Category is already inactive',
        DomainError,
      );
    });
  });

  describe('updateDetails', () => {
    it('rejects empty name', () => {
      const category = Category.create({ name: 'Electronics' });

      ResultAssertionHelper.assertResultFailure(
        category.updateDetails({ name: '   ' }),
        'Category name is required',
        DomainError,
      );
      expect(category.name).toBe('Electronics');
    });

    it('regenerates slug when name changes and slug is omitted', () => {
      const category = Category.create({ name: 'Electronics' });

      ResultAssertionHelper.assertResultSuccess(
        category.updateDetails({ name: 'Home & Garden' }),
      );

      expect(category.name).toBe('Home & Garden');
      expect(category.slug).toBe('home-garden');
    });

    it('uses the provided slug when name also changes', () => {
      const category = Category.create({ name: 'Electronics' });

      ResultAssertionHelper.assertResultSuccess(
        category.updateDetails({
          name: 'Home & Garden',
          slug: 'custom-home',
        }),
      );

      expect(category.name).toBe('Home & Garden');
      expect(category.slug).toBe('custom-home');
    });

    it('updates description and explicit slug only', () => {
      const category = Category.create({
        name: 'Electronics',
        description: 'Old',
      });

      ResultAssertionHelper.assertResultSuccess(
        category.updateDetails({
          slug: 'gadgets',
          description: 'New description',
        }),
      );

      expect(category.name).toBe('Electronics');
      expect(category.slug).toBe('gadgets');
      expect(category.description).toBe('New description');
    });
  });

  describe('serialization', () => {
    it('round-trips through toPrimitives and fromPrimitives', () => {
      const original = Category.create({
        id: 1,
        name: 'Electronics',
        description: 'Gadgets',
      });
      const restored = Category.fromPrimitives(original.toPrimitives());

      expect(restored.name).toBe(original.name);
      expect(restored.slug).toBe(original.slug);
      expect(restored.description).toBe(original.description);
    });
  });
});
