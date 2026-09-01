import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { DEFAULT_API_VERSION } from '../src/infrastructure/http/api-version';
import { buildSwaggerDocumentConfig } from '../src/infrastructure/swagger/swagger-document.config';

const outputArg = process.argv.find((arg) => arg.startsWith('--out='));
const outputPath = outputArg
  ? resolve(outputArg.slice('--out='.length))
  : resolve(__dirname, '..', 'openapi.json');

async function generateOpenApiSpec(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: DEFAULT_API_VERSION,
  });

  const document = SwaggerModule.createDocument(
    app,
    buildSwaggerDocumentConfig(),
  );

  writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf8');
  console.log(`OpenAPI spec written to ${outputPath}`);

  try {
    await app.close();
  } catch {
    // BullMQ workers may not fully initialize during spec-only bootstrap.
  }

  process.exit(0);
}

generateOpenApiSpec().catch((error: unknown) => {
  console.error('Failed to generate OpenAPI spec:', error);
  process.exit(1);
});
