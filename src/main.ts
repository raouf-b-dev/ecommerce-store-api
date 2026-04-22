import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { EnvConfigService } from './config/env-config.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ResultInterceptor } from './interceptors/result.interceptor';
import { SanitizeInterceptor } from './interceptors/sanitize.interceptor';
import { RedisIoAdapter } from './infrastructure/websocket/adapters/redis-io.adapter';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security: HTTP headers (Helmet)
  app.use(helmet());

  // Cookie parsing for refresh token transport
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

  const configService = app.get(EnvConfigService);
  const nodeEnv = configService.node.env;

  // Security: CORS with explicit origin whitelist
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

  // Graceful Shutdown Configuration
  app.enableShutdownHooks();

  // Safe timeout to forcefully kill the process if graceful shutdown hangs
  const GRACEFUL_SHUTDOWN_TIMEOUT = 15000;
  let isShuttingDown = false;

  const handleShutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    Logger.log(
      `Received ${signal}. Starting graceful shutdown...`,
      'Bootstrap',
    );

    // Fallback: force process exit after timeout if NestJS doesn't finish
    setTimeout(() => {
      Logger.error(
        `Graceful shutdown took longer than ${GRACEFUL_SHUTDOWN_TIMEOUT}ms. Forcing process exit.`,
        'Bootstrap',
      );
      process.exit(1);
    }, GRACEFUL_SHUTDOWN_TIMEOUT).unref();
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  const server = await app.listen(port);

  // Close the Redis pub/sub clients explicitly when NestJS HTTP server closes
  server.on('close', async () => {
    try {
      await redisIoAdapter.close();
      Logger.log('RedisIoAdapter closed', 'Bootstrap');
    } catch (err) {
      Logger.error('Error closing RedisIoAdapter', err, 'Bootstrap');
    }
  });

  Logger.log(
    `🚀 Server is running on port ${port} in ${nodeEnv} mode`,
    'Bootstrap',
  );
}
void bootstrap();
