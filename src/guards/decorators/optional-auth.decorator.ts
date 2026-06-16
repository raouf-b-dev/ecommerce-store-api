import { SetMetadata } from '@nestjs/common';

export const IS_OPTIONAL_AUTH_KEY = 'IS_OPTIONAL_AUTH';
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true);
