import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SeedDemoAuthUsersUseCase } from '../src/modules/authentication/core/application/seed/seed-demo-auth-users.usecase';
import { SeedDemoCatalogUseCase } from '../src/modules/products/core/application/seed/seed-demo-catalog.usecase';
import { SeedDemoInventoryUseCase } from '../src/modules/inventory/core/application/seed/seed-demo-inventory.usecase';
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

    console.log('\n--- Starting Local Database Seeding ---');

    const seedAuthFlow = async () => {
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
    };

    const seedCatalogFlow = async () => {
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
    };

    const results = await Promise.allSettled([
      seedAuthFlow(),
      seedCatalogFlow(),
    ]);

    const failures = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );
    if (failures.length > 0) {
      for (const f of failures) {
        console.error('Seed flow failed:', f.reason);
      }
      throw failures[0].reason;
    }

    console.log('\nSeeding completed successfully.\n');
  } catch (error) {
    console.error('\nUnexpected error during database seeding:', error);
    process.exitCode = 1;
  } finally {
    if (app) await app.close();
  }
}

bootstrap();
