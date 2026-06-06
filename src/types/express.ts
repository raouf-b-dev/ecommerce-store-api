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
