import { ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Full-app E2E shares one client IP across many suites; Redis-backed
    // auth @Throttle overrides (10/min) otherwise cause cascading 429s.
    if (process.env.NODE_ENV === 'test') {
      return true;
    }
    return super.canActivate(context);
  }

  protected getTracker(req: Request): Promise<string> {
    const userId = req.user?.userId;
    if (userId != null) {
      return Promise.resolve(`user_${userId}`);
    }

    return Promise.resolve(req.ip ?? 'unknown_ip');
  }
}
