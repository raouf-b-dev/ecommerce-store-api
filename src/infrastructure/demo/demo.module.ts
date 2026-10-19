import { Module } from '@nestjs/common';
import { AuthenticationModule } from '../../modules/authentication/authentication.module';
import { CartsModule } from '../../modules/carts/carts.module';
import { InventoryModule } from '../../modules/inventory/inventory.module';
import { OrdersModule } from '../../modules/orders/orders.module';
import { PaymentsModule } from '../../modules/payments/payments.module';
import { ProductsModule } from '../../modules/products/products.module';
import { DemoSeedRunner } from './core/application/ports/demo-seed-runner.port';
import { ResetDemoUseCase } from './core/application/usecases/reset-demo/reset-demo.usecase';
import { DemoController } from './demo.controller';
import { DEMO_SEED_RUNNER } from './demo.token';
import { DemoResetAuthGuard } from './primary-adapters/guards/demo-reset-auth.guard';
import { DemoSeedRunnerAdapter } from './secondary-adapters/adapters/demo-seed-runner.adapter';

/**
 * Ops composition for hosted-demo reset and CLI seed. Not a domain bounded
 * context. Registered next to HealthModule / PlatformModule in AppModule.
 * See ADR-0009.
 */
@Module({
  imports: [
    AuthenticationModule,
    ProductsModule,
    InventoryModule,
    CartsModule,
    OrdersModule,
    PaymentsModule,
  ],
  controllers: [DemoController],
  providers: [
    ResetDemoUseCase,
    DemoResetAuthGuard,
    {
      provide: DEMO_SEED_RUNNER,
      useClass: DemoSeedRunnerAdapter,
    },
    {
      provide: DemoSeedRunner,
      useExisting: DEMO_SEED_RUNNER,
    },
  ],
  exports: [DemoSeedRunner],
})
export class DemoModule {}
