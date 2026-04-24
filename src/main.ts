import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { EnvConfigService } from './config/env-config.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ResultInterceptor } from './interceptors/result.interceptor';
import { SanitizeInterceptor } from './interceptors/sanitize.interceptor';
import { RedisIoAdapter } from './infrastructure/websocket/adapters/redis-io.adapter';
import { RedisIoAdapterHost } from './infrastructure/websocket/redis-io-adapter.host';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const exitHandler = (error: any, type: string) => {
    Logger.error(
      `${type}: ${error instanceof Error ? error.stack : error}`,
      'Process',
    );
    app.close().finally(() => process.exit(1));
  };

  process.on('unhandledRejection', (reason: unknown) =>
    exitHandler(reason, 'Unhandled Promise Rejection'),
  );
  process.on('uncaughtException', (error: Error) =>
    exitHandler(error, 'Uncaught Exception'),
  );

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

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // Register adapter with the DI-managed host so NestJS handles its shutdown
  const adapterHost = app.get(RedisIoAdapterHost);
  adapterHost.setAdapter(redisIoAdapter);

  app.enableShutdownHooks();

  const configService = app.get(EnvConfigService);
  const nodeEnv = configService.node.env;

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
}
void bootstrap();
