import { SetMetadata } from '@nestjs/common';

export const ALLOW_DURING_PASSWORD_CHANGE_KEY = 'ALLOW_DURING_PASSWORD_CHANGE';

export const AllowDuringPasswordChange = () =>
  SetMetadata(ALLOW_DURING_PASSWORD_CHANGE_KEY, true);
