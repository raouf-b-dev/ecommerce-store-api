export enum SystemRoleCode {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  /** Hosted demo operator: access_admin + view_* only. */
  ADMIN_READONLY = 'ADMIN_READONLY',
  CUSTOMER = 'CUSTOMER',
}

export const DEFAULT_ROLE_CODE = SystemRoleCode.CUSTOMER;
