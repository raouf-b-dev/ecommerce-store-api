import {
  INestApplication,
  ValidationPipe,
  DynamicModule,
  Type,
  VersioningType,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from 'src/app.module';
import { DEFAULT_API_VERSION } from 'src/infrastructure/http/api-version';
import { GlobalExceptionFilter } from 'src/filters/global-exception.filter';
import { ResultInterceptor } from 'src/interceptors/result.interceptor';
import { SanitizeInterceptor } from 'src/interceptors/sanitize.interceptor';

type TestingImport = Type<unknown> | DynamicModule | Promise<DynamicModule>;
export type E2eHttpClient = ReturnType<typeof request.agent>;

export interface CreateE2eAppOptions {
  imports?: TestingImport[];
  configureTestingModule?: (
    builder: TestingModuleBuilder,
  ) => TestingModuleBuilder;
  applyGlobalPipesAndInterceptors?: boolean;
}

export interface E2eAppContext {
  app: INestApplication;
  moduleRef: TestingModule;
}

export const E2E_STRIPE_WEBHOOK_SECRET = 'whsec_e2e_test_secret';

export class E2eTestAppHelper {
  static async createApp(
    options: CreateE2eAppOptions = {},
  ): Promise<E2eAppContext> {
    process.env.STRIPE_WEBHOOK_SECRET =
      process.env.STRIPE_WEBHOOK_SECRET || E2E_STRIPE_WEBHOOK_SECRET;

    const imports = options.imports ?? [AppModule];
    const applyGlobals = options.applyGlobalPipesAndInterceptors !== false;

    let builder = Test.createTestingModule({ imports });

    if (options.configureTestingModule) {
      builder = options.configureTestingModule(builder);
    }

    const moduleRef = await builder.compile();
    const app = moduleRef.createNestApplication({ rawBody: true });

    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: DEFAULT_API_VERSION,
    });
    app.use(cookieParser());

    if (applyGlobals) {
      app.useGlobalInterceptors(
        new SanitizeInterceptor(app.get(Reflector)),
        new ResultInterceptor(),
      );
      app.useGlobalFilters(new GlobalExceptionFilter());
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
    }

    await app.init();

    return { app, moduleRef };
  }

  static getHttp(app: INestApplication): E2eHttpClient {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    return request.agent(httpServer);
  }

  static async closeApp(
    appOrContext?: INestApplication | E2eAppContext,
  ): Promise<void> {
    if (!appOrContext) return;
    const app = 'app' in appOrContext ? appOrContext.app : appOrContext;
    if (app && typeof app.close === 'function') {
      await app.close();
    }
  }
}
