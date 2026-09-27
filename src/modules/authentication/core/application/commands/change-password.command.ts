// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

export interface ChangePasswordCommand {
  userId: number;
  currentPassword: string;
  newPassword: string;
}
