import { Address } from './address';
import { AddressTestFactory } from 'src/modules/identity/testing';
import { AddressType } from '../../../../../shared-kernel/domain/value-objects/address-type';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('Address', () => {
  describe('construction', () => {
    it.each([
      ['street', { street: '' }],
      ['city', { city: '' }],
      ['state', { state: '' }],
      ['postalCode', { postalCode: '' }],
      ['country', { country: '' }],
    ] as const)('rejects missing %s', (field, override) => {
      const props = AddressTestFactory.createAddressProps(override);

      expect(() => new Address(props)).toThrow(DomainError);
    });

    it('normalizes country to uppercase', () => {
      const address = new Address(
        AddressTestFactory.createAddressProps({ country: 'us' }),
      );

      expect(address.country).toBe('US');
    });
  });

  describe('getFullAddress', () => {
    it('joins address parts with commas', () => {
      const address = new Address(
        AddressTestFactory.createAddressProps({
          street: '123 Main St',
          street2: 'Apt 4',
          city: 'Austin',
          state: 'TX',
          postalCode: '78701',
          country: 'US',
        }),
      );

      expect(address.getFullAddress()).toBe(
        '123 Main St, Apt 4, Austin, TX, 78701, US',
      );
    });
  });

  describe('default flag', () => {
    it('setAsDefault and unsetAsDefault toggle isDefault', () => {
      const address = new Address(
        AddressTestFactory.createAddressProps({ isDefault: false }),
      );

      address.setAsDefault();
      expect(address.isDefault).toBe(true);

      address.unsetAsDefault();
      expect(address.isDefault).toBe(false);
    });
  });

  describe('updateAddress', () => {
    it('applies partial updates', () => {
      const address = new Address(AddressTestFactory.createAddressProps());

      ResultAssertionHelper.assertResultSuccess(
        address.updateAddress({
          street: null,
          street2: null,
          city: 'Los Angeles',
          state: 'CA',
          postalCode: null,
          country: null,
          type: null,
          deliveryInstructions: null,
        }),
      );

      expect(address.city).toBe('Los Angeles');
      expect(address.state).toBe('CA');
    });

    it('rejects invalid update values', () => {
      const address = new Address(AddressTestFactory.createAddressProps());

      ResultAssertionHelper.assertResultFailure(
        address.updateAddress({
          street: '',
          street2: null,
          city: null,
          state: null,
          postalCode: null,
          country: null,
          type: null,
          deliveryInstructions: null,
        }),
        'Street address is required',
        DomainError,
      );
    });
  });
});
