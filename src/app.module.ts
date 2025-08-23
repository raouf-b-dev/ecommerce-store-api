// src/app.module.ts (snippet)
import { existsSync } from 'fs';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { EnvConfigModule } from './config/config.module';
import { DatabaseModule } from './core/infrastructure/database/database.module';
import { RedisModule } from './core/infrastructure/redis/redis.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';
import { CoreModule } from './core/core.module';

const env = process.env.NODE_ENV || 'development';
const envFilePath = `.env.${env}`;
const loadEnvFile = existsSync(envFilePath) ? envFilePath : undefined;

@Module({
  imports: [
    EnvConfigModule,
    CoreModule,
    DatabaseModule,
    RedisModule,
    ProductsModule,
    OrdersModule,

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: loadEnvFile,
      expandVariables: true,
      load: [configuration],
    }),
  ],
})
export class AppModule {}
