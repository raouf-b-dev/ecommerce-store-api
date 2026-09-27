// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import { JWK } from 'jose';

export abstract class JwksPort {
  abstract getPublicKey(): CryptoKey;
  abstract getJwks(): { keys: JWK[] };
  abstract getKid(): string;
}
