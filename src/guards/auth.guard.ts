import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtVerifierPort } from '../shared-kernel/domain/interfaces/jwt-verifier.port';
import { Reflector } from '@nestjs/core';
import { extractBearerToken } from './extract-bearer-token';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { IS_OPTIONAL_AUTH_KEY } from './decorators/optional-auth.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtVerifierService: JwtVerifierPort,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const isOptionalAuth = this.reflector.getAllAndOverride<boolean>(
      IS_OPTIONAL_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request);

    if (!token) {
      if (isOptionalAuth) {
        request.user = undefined;
        return true;
      }
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const payload = await this.jwtVerifierService.verifyAccessToken(token);

      // the payload contains sub, email, role
      // we attach exactly what current-user.decorator.ts expects
      request.user = {
        userId: Number(payload.sub),
        email: payload.email,
        role: payload.role,
      };
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired authentication token',
      );
    }

    return true;
  }
}
