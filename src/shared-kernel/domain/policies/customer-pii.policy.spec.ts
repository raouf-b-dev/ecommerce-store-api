import { CustomerPiiPolicy } from './customer-pii.policy';
import {
  SYSTEM_CALLER_CONTEXT,
  createUserCallerContext,
} from '../interfaces/caller-context.interface';

describe('CustomerPiiPolicy', () => {
  const admin = createUserCallerContext({
    userId: 1,
    role: 'ADMIN',
    permissions: new Set(['view_all_orders', 'view_customer_pii']),
  });
  const viewer = createUserCallerContext({
    userId: 3,
    role: 'ADMIN_READONLY',
    permissions: new Set(['access_admin', 'view_all_orders']),
  });
  const customer = createUserCallerContext({
    userId: 2,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_orders']),
  });
  const record = {
    id: 10,
    userId: 2,
    userName: 'Jane Doe',
    userEmail: 'jane@example.com',
    shippingAddress: 'Jane Doe, 1 Main St, +1 555 0100',
    totalAmount: 42,
  };

  it('returns the record unchanged with view_customer_pii', () => {
    expect(CustomerPiiPolicy.present(record, admin)).toBe(record);
  });

  it('returns the record unchanged for the system caller', () => {
    expect(CustomerPiiPolicy.present(record, SYSTEM_CALLER_CONTEXT)).toBe(
      record,
    );
  });

  it('returns the record unchanged for the customer who owns it', () => {
    expect(CustomerPiiPolicy.present(record, customer)).toBe(record);
  });

  it('masks name, email, and address without view_customer_pii', () => {
    expect(CustomerPiiPolicy.present(record, viewer)).toEqual({
      id: 10,
      userId: 2,
      userName: 'Customer #2',
      userEmail: 'j***@***.com',
      shippingAddress: null,
      totalAmount: 42,
    });
  });

  it('masks another customer record for a customer', () => {
    expect(
      CustomerPiiPolicy.present({ ...record, userId: 9 }, customer).userEmail,
    ).toBe('j***@***.com');
  });

  it('does not add a shippingAddress key to records without one', () => {
    const { shippingAddress: _omit, ...listItem } = record;
    expect(CustomerPiiPolicy.present(listItem, viewer)).not.toHaveProperty(
      'shippingAddress',
    );
  });

  it('keeps a null email null', () => {
    expect(CustomerPiiPolicy.maskEmail(null)).toBeNull();
  });
});
