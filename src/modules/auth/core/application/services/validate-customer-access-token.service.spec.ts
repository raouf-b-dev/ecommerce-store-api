import { validateCustomerAccessTokenBinding } from './validate-customer-access-token.service';
import { SystemRoleCode } from '../../domain/reference-data/system-roles';

describe('validateCustomerAccessTokenBinding', () => {
  it('returns null for staff roles without customerId', () => {
    expect(
      validateCustomerAccessTokenBinding(SystemRoleCode.ADMIN, null),
    ).toBeNull();
  });

  it('returns null for customer role with customerId', () => {
    expect(
      validateCustomerAccessTokenBinding(SystemRoleCode.CUSTOMER, 123),
    ).toBeNull();
  });

  it('rejects customer role without customerId', () => {
    const result = validateCustomerAccessTokenBinding(
      SystemRoleCode.CUSTOMER,
      null,
    );

    expect(result?.isFailure).toBe(true);
  });
});
