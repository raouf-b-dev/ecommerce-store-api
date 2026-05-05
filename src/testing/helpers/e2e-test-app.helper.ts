import {
  INestApplication,
  ValidationPipe,
  DynamicModule,
  Type,
} from '@nestjs/common';
import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
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

export class E2eTestAppHelper {
  static async createApp(
    options: CreateE2eAppOptions = {},
  ): Promise<E2eAppContext> {
    const imports = options.imports ?? [AppModule];
    const applyGlobals = options.applyGlobalPipesAndInterceptors !== false;

    let builder = Test.createTestingModule({ imports });

    if (options.configureTestingModule) {
      builder = options.configureTestingModule(builder);
    }

    const moduleRef = await builder.compile();
    const app = moduleRef.createNestApplication();

    if (applyGlobals) {
      app.useGlobalInterceptors(
        new SanitizeInterceptor(),
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
    appOrContext: INestApplication | E2eAppContext,
  ): Promise<void> {
    const app = 'app' in appOrContext ? appOrContext.app : appOrContext;
    await app.close();
  }
}
