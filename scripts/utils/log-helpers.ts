// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export const maskEmail = (email: string): string => {
  if (!email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  if (local.length <= 1) return `***@${domain}`;
  return `${local[0]}***@${domain}`;
};

export const statusLabel = (status: 'created' | 'existing'): string =>
  status === 'created' ? 'created' : 'already exists';
