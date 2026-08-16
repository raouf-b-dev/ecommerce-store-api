import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Request): Promise<string> {
    const userId = req.user?.userId;
    if (userId != null) {
      return Promise.resolve(`user_${userId}`);
    }

    return Promise.resolve(req.ip ?? 'unknown_ip');
  }
}
