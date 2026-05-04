import { SYSTEM_PERMISSIONS } from './permission-definitions';

export enum SystemRoleCode {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
}

export const DEFAULT_ROLE_CODE = SystemRoleCode.CUSTOMER;

export interface SystemRoleDefinition {
  code: SystemRoleCode;
  name: string;
  isSystem: boolean;
  permissions: string[];
}

export const SYSTEM_ROLES: SystemRoleDefinition[] = [
  {
    code: SystemRoleCode.SUPER_ADMIN,
    name: 'Super Administrator',
    isSystem: true,
    permissions: SYSTEM_PERMISSIONS.map((p) => p.code),
  },
  {
    code: SystemRoleCode.ADMIN,
    name: 'Administrator',
    isSystem: true,
    permissions: SYSTEM_PERMISSIONS.map((p) => p.code).filter(
      (code) => code !== 'manage_roles',
    ),
  },
  {
    code: SystemRoleCode.CUSTOMER,
    name: 'Customer',
    isSystem: true,
    permissions: [],
  },
];
