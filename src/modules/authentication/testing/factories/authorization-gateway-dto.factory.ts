// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { RoleRecord } from '../../core/application/ports/authorization.gateway';

export class AuthorizationGatewayDtoFactory {
  static buildRoleRecord(overrides?: Partial<RoleRecord>): RoleRecord {
    const baseCommand: RoleRecord = {
      id: 1,
      code: 'CUSTOMER',
      permissions: ['view_own_profile', 'view_own_orders'],
    };

    return { ...baseCommand, ...overrides };
  }
}
