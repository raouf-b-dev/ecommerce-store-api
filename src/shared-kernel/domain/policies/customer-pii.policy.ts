import {
  CallerContext,
  isSystemCaller,
} from '../interfaces/caller-context.interface';

/** Permission that unlocks other customers' personal data (name, email, phone, addresses). */
export const CUSTOMER_PII_PERMISSION = 'view_customer_pii';

/** List filters that match on customer contact data. */
export const CUSTOMER_CONTACT_FILTERS = [
  'userEmail',
  'userName',
  'firstName',
  'lastName',
] as const;

/** Customer contact fields embedded in a read model (order, payment). */
export interface CustomerContactFields {
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  shippingAddress?: string | null;
}

/**
 * Single rule for customer personal data leaving the API.
 *
 * A caller sees the real name, email, phone, and address of a customer when
 * it is the system, holds view_customer_pii, or is that customer. Any other
 * caller (for example a role with view_all_orders but no
 * view_customer_pii, such as the read-only demo admin) gets masked
 * placeholders: "Customer #<id>" for the name, a masked email such as
 * "j***@***.com", and no address. The decision uses permissions only, never
 * a role name.
 */
export class CustomerPiiPolicy {
  static canViewAll(callerContext: CallerContext): boolean {
    return (
      isSystemCaller(callerContext) ||
      callerContext.permissions.has(CUSTOMER_PII_PERMISSION)
    );
  }

  static canView(
    callerContext: CallerContext,
    customerUserId: number | null,
  ): boolean {
    if (CustomerPiiPolicy.canViewAll(callerContext)) {
      return true;
    }
    return (
      customerUserId !== null &&
      Boolean(callerContext.userId) &&
      Number(callerContext.userId) === Number(customerUserId)
    );
  }

  /**
   * Whether a list query may filter on customer contact data. A caller that
   * cannot see contact data must not probe it through search filters either,
   * unless the query is already scoped to the caller's own records.
   */
  static canFilterByContact(
    callerContext: CallerContext,
    query: Partial<Record<(typeof CUSTOMER_CONTACT_FILTERS)[number], unknown>>,
    scopedUserId: number | undefined,
  ): boolean {
    if (!CUSTOMER_CONTACT_FILTERS.some((key) => query[key] !== undefined)) {
      return true;
    }
    return CustomerPiiPolicy.canView(callerContext, scopedUserId ?? null);
  }

  static maskName(customerUserId: number | null): string {
    return customerUserId === null ? 'Customer' : `Customer #${customerUserId}`;
  }

  /** "jane@example.com" -> "j***@***.com"; null stays null. */
  static maskEmail(email: string | null): string | null {
    if (!email) return null;
    const at = email.indexOf('@');
    const first = at > 0 ? email[0] : '';
    const domain = at >= 0 ? email.slice(at + 1) : '';
    const dot = domain.lastIndexOf('.');
    const tld = dot >= 0 ? domain.slice(dot) : '';
    return `${first}***@***${tld}`;
  }

  /**
   * The one presenter every read model with customer contact fields goes
   * through before it leaves a use case.
   */
  static present<T extends CustomerContactFields>(
    record: T,
    callerContext: CallerContext,
  ): T {
    if (CustomerPiiPolicy.canView(callerContext, record.userId)) {
      return record;
    }
    return {
      ...record,
      userName: CustomerPiiPolicy.maskName(record.userId),
      userEmail: CustomerPiiPolicy.maskEmail(record.userEmail),
      ...('shippingAddress' in record ? { shippingAddress: null } : {}),
    };
  }
}
