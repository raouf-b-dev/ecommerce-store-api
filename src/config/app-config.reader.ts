// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { AppConfigKey, IAppConfig } from './configuration';

export interface AppConfigReader {
  get<T extends AppConfigKey>(key: T): IAppConfig[T] | undefined;
}
