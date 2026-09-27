import { SYSTEM_PERMISSIONS } from './permission-definitions';
import {
  SystemRoleCode,
  DEFAULT_ROLE_CODE,
} from 'src/shared-kernel/domain/value-objects/system-roles';

export { SystemRoleCode, DEFAULT_ROLE_CODE };

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
    permissions: [
      'view_own_orders',
      'view_own_payments',
      'manage_own_cart',
      'view_own_profile',
      'manage_own_addresses',
    ],
  },
];
