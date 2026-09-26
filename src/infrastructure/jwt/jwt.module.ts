// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Global, Module } from '@nestjs/common';
import { JwksService } from './services/jwks.service';
import { JwtVerifierService } from './services/jwt-verifier.service';
import { JwtVerifierPort } from '../../shared-kernel/domain/interfaces/jwt-verifier.port';
import { JwksPort } from './ports/jwks.port';

@Global()
@Module({
  providers: [
    {
      provide: JwksPort,
      useClass: JwksService,
    },
    {
      provide: JwtVerifierPort,
      useClass: JwtVerifierService,
    },
  ],
  exports: [JwksPort, JwtVerifierPort],
})
export class JwtModule {}
