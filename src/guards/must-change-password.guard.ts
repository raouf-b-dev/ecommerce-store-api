import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CredentialRepository } from '../modules/authentication/core/domain/repositories/credential.repository';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { ALLOW_DURING_PASSWORD_CHANGE_KEY } from './decorators/allow-during-password-change.decorator';

@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly credentialRepository: CredentialRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const allowDuringPasswordChange = this.reflector.getAllAndOverride<boolean>(
      ALLOW_DURING_PASSWORD_CHANGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (allowDuringPasswordChange) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      return true;
    }

    // The claim is only present on tokens minted while the credential was
    // flagged, so nearly every request short-circuits here without a query.
    // A flagged token is still confirmed against the database below, so a
    // rotation performed on another client cannot lock the user out.
    if (!user.mustChangePassword) {
      return true;
    }

    const credentialResult = await this.credentialRepository.findByUserId(
      user.userId,
    );

    if (credentialResult.isFailure || !credentialResult.value) {
      throw new ForbiddenException({
        message: 'Password change required before accessing this resource',
        error: 'MUST_CHANGE_PASSWORD',
      });
    }

    if (credentialResult.value.mustChangePassword) {
      throw new ForbiddenException({
        message: 'Password change required before accessing this resource',
        error: 'MUST_CHANGE_PASSWORD',
      });
    }

    return true;
  }
}
