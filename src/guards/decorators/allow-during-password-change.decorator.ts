// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import { SetMetadata } from '@nestjs/common';

export const ALLOW_DURING_PASSWORD_CHANGE_KEY = 'ALLOW_DURING_PASSWORD_CHANGE';

export const AllowDuringPasswordChange = () =>
  SetMetadata(ALLOW_DURING_PASSWORD_CHANGE_KEY, true);
