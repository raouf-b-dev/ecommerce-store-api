import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RevokeAllForUserUsecase } from '../../core/application/usecases/revoke-all-for-user/revoke-all-for-user.usecase';

@Injectable()
export class UserDeactivatedListener {
  private readonly logger = new Logger(UserDeactivatedListener.name);

  constructor(
    private readonly revokeAllForUserUsecase: RevokeAllForUserUsecase,
  ) {}

  @OnEvent('user.deactivated')
  async handleUserDeactivated(payload: { userId: number }): Promise<void> {
    this.logger.log(
      `Handling user.deactivated event for userId: ${payload.userId}`,
    );
    const result = await this.revokeAllForUserUsecase.execute(payload.userId);
    if (result.isFailure) {
      this.logger.error(
        `Failed to revoke sessions for deactivated user ${payload.userId}: ${result.error?.message}`,
      );
    } else {
      this.logger.log(
        `Successfully revoked all sessions for deactivated user ${payload.userId}`,
      );
    }
  }
}
