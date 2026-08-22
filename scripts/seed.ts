import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SeedDemoAuthUsersUseCase } from '../src/modules/authentication/core/application/seed/seed-demo-auth-users.usecase';
import { SeedDemoCatalogUseCase } from '../src/modules/products/core/application/seed/seed-demo-catalog.usecase';
import { SeedDemoInventoryUseCase } from '../src/modules/inventory/core/application/seed/seed-demo-inventory.usecase';
import { SeedDemoCartUseCase } from '../src/modules/carts/core/application/seed/seed-demo-cart.usecase';
import { SeedDemoOrdersUseCase } from '../src/modules/orders/core/application/seed/seed-demo-orders.usecase';
import { maskEmail, statusLabel } from './utils/log-helpers';

async function bootstrap() {
  if (process.env.NODE_ENV === 'production') {
    console.error(
      'SEEDING BLOCKED: Database seeding is not permitted in production (NODE_ENV=production).',
    );
    process.exit(1);
  }

  let app:
    | Awaited<ReturnType<typeof NestFactory.createApplicationContext>>
    | undefined;

  try {
    app = await NestFactory.createApplicationContext(AppModule);

    const seedAuthUsersUseCase = app.get(SeedDemoAuthUsersUseCase);
    const seedCatalogUseCase = app.get(SeedDemoCatalogUseCase);
    const seedInventoryUseCase = app.get(SeedDemoInventoryUseCase);
    const seedCartUseCase = app.get(SeedDemoCartUseCase);
    const seedOrdersUseCase = app.get(SeedDemoOrdersUseCase);

    console.log('\n--- Starting Local Database Seeding ---');

    // 1. Seed Auth Users
    const authUsersResult = await seedAuthUsersUseCase.execute();
    if (authUsersResult.isFailure) {
      throw authUsersResult.error;
    }
    console.log(
      `Admin user ${statusLabel(authUsersResult.value.admin.status)}: ${maskEmail(
        authUsersResult.value.admin.email,
      )}`,
    );
    console.log(
      `Customer user ${statusLabel(
        authUsersResult.value.customer.status,
      )}: ${maskEmail(authUsersResult.value.customer.email)}`,
    );

    const customerUserId = authUsersResult.value.customer.userId;

    // 2. Seed Catalog & Inventory
    const catalogResult = await seedCatalogUseCase.execute();
    if (catalogResult.isFailure) {
      throw catalogResult.error;
    }
    const createdProducts = catalogResult.value.filter(
      (product) => product.status === 'created',
    ).length;
    console.log(
      `Products ready: ${catalogResult.value.length} total (${createdProducts} created).`,
    );

    const inventoryResult = await seedInventoryUseCase.execute(
      catalogResult.value.map((product) => ({
        productId: product.id,
        sku: product.sku,
        initialStock: product.initialStock,
        lowStockThreshold: product.lowStockThreshold,
      })),
    );
    if (inventoryResult.isFailure) {
      throw inventoryResult.error;
    }
    const createdInventory = inventoryResult.value.filter(
      (item) => item.status === 'created',
    ).length;
    console.log(
      `Inventory ready: ${inventoryResult.value.length} total (${createdInventory} created).`,
    );

    const products = catalogResult.value;

    // 3. Seed Cart for customer
    const cartResult = await seedCartUseCase.execute({
      userId: customerUserId,
      products,
    });
    if (cartResult.isFailure) {
      throw cartResult.error;
    }
    console.log(
      `Cart ready: ${cartResult.value.itemCount} items (${statusLabel(
        cartResult.value.status,
      )}).`,
    );

    // 4. Seed Orders for customer
    const ordersResult = await seedOrdersUseCase.execute({
      userId: customerUserId,
      products,
    });
    if (ordersResult.isFailure) {
      throw ordersResult.error;
    }
    const createdOrdersCount = ordersResult.value.filter(
      (o) => o.seedStatus === 'created',
    ).length;
    console.log(
      `Orders ready: ${ordersResult.value.length} total (${createdOrdersCount} created).`,
    );

    console.log('\nSeeding completed successfully.\n');
  } catch (error) {
    console.error('\nUnexpected error during database seeding:', error);
    process.exitCode = 1;
  } finally {
    if (app) await app.close();
  }
}

bootstrap();
