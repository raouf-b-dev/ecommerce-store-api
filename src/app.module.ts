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
import { CustomersModule } from './modules/customers/customers.module';
import { AuthModule } from './modules/auth/auth.module';
import { InfrastructureModule } from './core/infrastructure/infrastructure.module';
import { ScheduleModule } from '@nestjs/schedule';
import { WebsocketModule } from './core/infrastructure/websocket/websocket.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

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
    CustomersModule,
    AuthModule,
    WebsocketModule,
    NotificationsModule,

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: loadEnvFile,
      expandVariables: true,
      load: [configuration],
    }),
  ],
})
export class AppModule {}
