import { DocumentBuilder } from '@nestjs/swagger';
import { getAppVersion } from '../../shared-kernel/helpers/lang/app-version';

export function buildSwaggerDocumentConfig(): ReturnType<
  DocumentBuilder['build']
> {
  return new DocumentBuilder()
    .setTitle('E-Commerce API')
    .setDescription('API documentation for E-Commerce API modules')
    .setVersion(getAppVersion())
    .addBearerAuth()
    .build();
}
