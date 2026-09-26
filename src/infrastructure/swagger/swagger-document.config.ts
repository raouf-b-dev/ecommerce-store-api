// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { DocumentBuilder } from '@nestjs/swagger';

export function buildSwaggerDocumentConfig(): ReturnType<
  DocumentBuilder['build']
> {
  return new DocumentBuilder()
    .setTitle('E-Commerce API')
    .setDescription('API documentation for E-Commerce API modules')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
}
