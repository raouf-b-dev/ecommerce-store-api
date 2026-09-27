import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { resolveEnvFilePath } from './config/resolve-env-file-path';
import { EnvConfigModule } from './config/config.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';
import { CartsModule } from './modules/carts/carts.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { IdentityModule } from './modules/identity/identity.module';
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { ScheduleModule } from '@nestjs/schedule';
import { WebsocketModule } from './infrastructure/websocket/websocket.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthModule } from './modules/health/health.module';
import { ShutdownModule } from './infrastructure/shutdown/shutdown.module';
import { APP_GUARD } from '@nestjs/core';
import { PermissionsGuard } from './modules/authorization/primary-adapter/guards/permissions.guard';
import { AuthGuard } from './guards/auth.guard';
import { MustChangePasswordGuard } from './guards/must-change-password.guard';

const loadEnvFile = resolveEnvFilePath();

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
    IdentityModule,
    AuthorizationModule,
    AuthenticationModule,
    WebsocketModule,
    NotificationsModule,
    AnalyticsModule,
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
      useClass: MustChangePasswordGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
