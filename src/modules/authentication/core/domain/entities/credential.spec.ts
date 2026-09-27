// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import { Credential } from './credential';

describe('Credential', () => {
  it('changePassword updates hash and clears mustChangePassword', () => {
    const credential = Credential.fromPersistence({
      id: 1,
      userId: 10,
      passwordHash: 'old-hash',
      mustChangePassword: true,
    });

    credential.changePassword('new-hash');

    expect(credential.passwordHash).toBe('new-hash');
    expect(credential.mustChangePassword).toBe(false);
  });
});
