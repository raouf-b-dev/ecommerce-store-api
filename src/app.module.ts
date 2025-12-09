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

const env = process.env.NODE_ENV || 'development';
const envFilePath = `.env.${env}`;
const loadEnvFile = existsSync(envFilePath) ? envFilePath : undefined;

@Module({
  imports: [
    EnvConfigModule,
    InfrastructureModule,
    ProductsModule,
    OrdersModule,
    CartsModule,
    PaymentsModule,
    InventoryModule,
    CustomersModule,
    AuthModule,

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: loadEnvFile,
      expandVariables: true,
      load: [configuration],
    }),
  ],
})
export class AppModule {}
