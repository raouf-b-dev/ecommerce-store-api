// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

export interface CreateUserCommand {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}
