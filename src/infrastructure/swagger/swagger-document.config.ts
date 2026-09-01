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
