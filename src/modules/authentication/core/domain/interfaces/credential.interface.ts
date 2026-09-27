// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

export interface ICredential {
  id: number | null;
  userId: number;
  passwordHash: string;
  mustChangePassword: boolean;
}
