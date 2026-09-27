import { ProductTestFactory } from 'src/modules/products/testing';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('Product', () => {
  describe('construction', () => {
    it('rejects empty name', () => {
      expect(() =>
        ProductTestFactory.createDomainProduct({ name: '   ' }),
      ).toThrow(DomainError);
    });

    it('rejects negative price', () => {
      expect(() =>
        ProductTestFactory.createDomainProduct({ price: -1 }),
      ).toThrow(DomainError);
    });

    it('generates slug from name and uppercases sku', () => {
      const product = ProductTestFactory.createDomainProduct({
        name: 'Cool Gadget',
        sku: 'gadget-001',
        slug: undefined,
      });

      expect(product.slug).toBe('cool-gadget');
      expect(product.sku).toBe('GADGET-001');
    });

    it('rounds price to two decimal places', () => {
      const product = ProductTestFactory.createDomainProduct({
        price: 19.999,
      });

      expect(product.price).toBe(20);
    });
  });

  describe('updateName', () => {
    it('regenerates slug when name changes', () => {
      const product = ProductTestFactory.createDomainProduct({
        name: 'Old Name',
      });

      ResultAssertionHelper.assertResultSuccess(
        product.updateName('New Product Name'),
      );

      expect(product.name).toBe('New Product Name');
      expect(product.slug).toBe('new-product-name');
    });
  });

  describe('updatePrice', () => {
    it('rejects negative price', () => {
      const product = ProductTestFactory.createDomainProduct();

      ResultAssertionHelper.assertResultFailure(
        product.updatePrice(-5),
        'Product price cannot be negative',
        DomainError,
      );
    });
  });

  describe('activate and deactivate', () => {
    it('toggles isActive flag', () => {
      const product = ProductTestFactory.createDomainProduct({
        isActive: true,
      });

      ResultAssertionHelper.assertResultSuccess(product.deactivate());
      expect(product.isActive).toBe(false);

      ResultAssertionHelper.assertResultSuccess(product.activate());
      expect(product.isActive).toBe(true);
    });

    it('rejects activate when already active', () => {
      const product = ProductTestFactory.createDomainProduct({
        isActive: true,
      });

      ResultAssertionHelper.assertResultFailure(
        product.activate(),
        'Product is already active',
        DomainError,
      );
    });

    it('rejects deactivate when already inactive', () => {
      const product = ProductTestFactory.createDomainProduct({
        isActive: false,
      });

      ResultAssertionHelper.assertResultFailure(
        product.deactivate(),
        'Product is already inactive',
        DomainError,
      );
    });
  });

  describe('serialization', () => {
    it('round-trips through toPrimitives and fromPrimitives', () => {
      const original = ProductTestFactory.createDomainProduct();
      const restored = ProductTestFactory.createDomainProduct(
        original.toPrimitives(),
      );

      expect(restored.name).toBe(original.name);
      expect(restored.slug).toBe(original.slug);
      expect(restored.price).toBe(original.price);
      expect(restored.sku).toBe(original.sku);
    });
  });
});
