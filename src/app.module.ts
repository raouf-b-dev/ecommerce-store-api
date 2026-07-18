import { existsSync } from 'fs';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { EnvConfigModule } from './config/config.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';
import { CartsModule } from './modules/carts/carts.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { AccessModule } from './modules/access/access.module';
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { ScheduleModule } from '@nestjs/schedule';
import { WebsocketModule } from './infrastructure/websocket/websocket.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';
import { ShutdownModule } from './infrastructure/shutdown/shutdown.module';
import { APP_GUARD } from '@nestjs/core';
import { PermissionsGuard } from './modules/access/primary-adapters/guards/permissions.guard';
import { AuthGuard } from './guards/auth.guard';

const env = process.env.NODE_ENV || 'development';
const envFilePath = `.env.${env}`;
const loadEnvFile = existsSync(envFilePath) ? envFilePath : undefined;

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EnvConfigModule,
    InfrastructureModule,
    ProductsModule,
    OrdersModule,
    CartsModule,
    PaymentsModule,
    InventoryModule,
    AccessModule,
    AuthenticationModule,
    WebsocketModule,
    NotificationsModule,
    HealthModule,
    ShutdownModule,

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: loadEnvFile,
      expandVariables: true,
      load: [configuration],
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
