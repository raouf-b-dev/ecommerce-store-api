// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export interface ICredential {
  id: number | null;
  userId: number;
  passwordHash: string;
  mustChangePassword: boolean;
}
