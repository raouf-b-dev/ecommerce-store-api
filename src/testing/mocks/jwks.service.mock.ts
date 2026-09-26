// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { JwksPort } from '../../infrastructure/jwt/ports/jwks.port';

export class MockJwksService implements JwksPort {
  onModuleInit = jest.fn().mockResolvedValue(undefined);
  getPublicKey = jest.fn().mockReturnValue('mock-public-key');
  getJwks = jest.fn().mockReturnValue({ keys: [] });
  getKid = jest.fn().mockReturnValue('mock-kid');
}
