// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { CurrentUserPayload } from '../shared-kernel/domain/interfaces/current-user.interface';
import { IRolePermissions } from '../shared-kernel/domain/interfaces/role-permissions.interface';
import { VerifiedAccessTokenPayload } from '../shared-kernel/domain/interfaces/jwt-payload.interface';

declare module 'express-serve-static-core' {
  interface Request {
    user?: CurrentUserPayload;
    userPermissions?: IRolePermissions;
    correlationId?: string;
  }
}

declare module 'socket.io' {
  interface Socket {
    user?: VerifiedAccessTokenPayload;
  }
}
