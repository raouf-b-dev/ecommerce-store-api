// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

export interface AuthTokensResult {
  accessToken: string;
  refreshToken: string;
  mustChangePassword: boolean;
  permissions: string[];
}
