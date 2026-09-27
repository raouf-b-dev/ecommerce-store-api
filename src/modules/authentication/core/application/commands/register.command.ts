// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

export interface RegisterCommand {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}
