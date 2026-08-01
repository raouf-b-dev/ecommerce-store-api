import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const user = req.user;
    if (user && (user.sub || user.userId || user.id)) {
      const identifier = user.sub || user.userId || user.id;
      return `user_${identifier}`;
    }
    return req.ip || req.connection?.remoteAddress || 'unknown_ip';
  }
}
