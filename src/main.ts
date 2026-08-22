import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { EnvConfigService } from './config/env-config.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ResultInterceptor } from './interceptors/result.interceptor';
import { SanitizeInterceptor } from './interceptors/sanitize.interceptor';
import { RedisIoAdapter } from './infrastructure/websocket/adapters/redis-io.adapter';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { WinstonLoggerService } from './infrastructure/logging/winston-logger.service';
import { DEFAULT_API_VERSION } from './infrastructure/http/api-version';
import { parseTrustProxy } from './infrastructure/http/parse-trust-proxy';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: DEFAULT_API_VERSION,
  });

  const winstonLogger = app.get(WinstonLoggerService);
  app.useLogger(winstonLogger);

  app.use(helmet());
  app.use(cookieParser());

  app.useGlobalInterceptors(new SanitizeInterceptor(), new ResultInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  const configService = app.get(EnvConfigService);
  const nodeEnv = configService.node.env;

  app.set('trust proxy', parseTrustProxy(configService.http.trustProxy));

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.enableCors({
    origin: configService.cors.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('E-Commerce API')
      .setDescription('API documentation for E-Commerce API modules')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);

    Logger.log(
      `📖 Swagger docs available at http://localhost:${configService.node.port}/api/docs`,
      'Bootstrap',
    );
  }

  const port = process.env.DEBUG_PORT
    ? parseInt(process.env.DEBUG_PORT, 10)
    : configService.node.port;

  try {
    await app.listen(port);

    Logger.log(
      `🚀 Server is running on port ${port} in ${nodeEnv} mode`,
      'Bootstrap',
    );
  } catch (error: any) {
    if (error.code === 'EADDRINUSE') {
      Logger.error(
        `Port ${port} is already in use. Another process (or container) is ` +
          `already listening on this port. Stop the other process or change ` +
          `the PORT environment variable, then try again.`,
        'Bootstrap',
      );
      process.exit(1);
    }
    throw error;
  }

  const SHUTDOWN_TIMEOUT_MS = 15_000;
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      Logger.log(
        `Received ${signal} — starting graceful shutdown (${SHUTDOWN_TIMEOUT_MS / 1000}s timeout)`,
        'Bootstrap',
      );
      setTimeout(() => {
        Logger.error(
          `Graceful shutdown timed out after ${SHUTDOWN_TIMEOUT_MS / 1000}s — forcing exit`,
          undefined,
          'Bootstrap',
        );
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS).unref();
    });
  }
}
void bootstrap();
