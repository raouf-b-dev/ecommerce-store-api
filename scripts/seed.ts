import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SeedDemoAuthUsersUseCase } from '../src/modules/authentication/core/application/seed/seed-demo-auth-users.usecase';
import { SeedDemoCategoriesUseCase } from '../src/modules/products/core/application/seed/seed-demo-categories.usecase';
import { SeedDemoCatalogUseCase } from '../src/modules/products/core/application/seed/seed-demo-catalog.usecase';
import { SeedDemoInventoryUseCase } from '../src/modules/inventory/core/application/seed/seed-demo-inventory.usecase';
import { SeedDemoInventoryFromOrdersUseCase } from '../src/modules/inventory/core/application/seed/seed-demo-inventory-from-orders.usecase';
import { SeedDemoCartUseCase } from '../src/modules/carts/core/application/seed/seed-demo-cart.usecase';
import { SeedDemoOrdersUseCase } from '../src/modules/orders/core/application/seed/seed-demo-orders.usecase';
import { LinkDemoOrderPaymentsUseCase } from '../src/modules/orders/core/application/seed/link-demo-order-payments.usecase';
import { SeedDemoPaymentsUseCase } from '../src/modules/payments/core/application/seed/seed-demo-payments.usecase';
import {
  DEMO_PAYMENT_BY_REFERENCE,
  utcDaysAgo,
} from '../src/modules/payments/core/application/seed/demo-payments';
import { maskEmail, statusLabel } from './utils/log-helpers';

const authOnly = process.argv.includes('--auth-only');

function inventoryEffectForStatus(
  status: string,
): 'hold' | 'consume' | null {
  if (status === 'pending_payment') {
    return 'hold';
  }
  if (
    status === 'confirmed' ||
    status === 'processing' ||
    status === 'shipped' ||
    status === 'delivered'
  ) {
    return 'consume';
  }
  return null;
}

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
    const seedCategoriesUseCase = app.get(SeedDemoCategoriesUseCase);
    const seedCatalogUseCase = app.get(SeedDemoCatalogUseCase);
    const seedInventoryUseCase = app.get(SeedDemoInventoryUseCase);
    const seedCartUseCase = app.get(SeedDemoCartUseCase);
    const seedOrdersUseCase = app.get(SeedDemoOrdersUseCase);
    const seedPaymentsUseCase = app.get(SeedDemoPaymentsUseCase);
    const linkOrderPaymentsUseCase = app.get(LinkDemoOrderPaymentsUseCase);
    const seedInventoryFromOrdersUseCase = app.get(
      SeedDemoInventoryFromOrdersUseCase,
    );

    console.log(
      authOnly
        ? '\n--- Re-seeding demo auth users (e2e prep) ---'
        : '\n--- Starting Local Database Seeding ---',
    );

    const authUsersResult = await seedAuthUsersUseCase.execute();
    if (authUsersResult.isFailure) {
      throw authUsersResult.error;
    }
    console.log(
      `Super admin user ${statusLabel(
        authUsersResult.value.superAdmin.status,
      )}: ${maskEmail(authUsersResult.value.superAdmin.email)}`,
    );
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

    if (authOnly) {
      console.log('\nAuth seed completed successfully.\n');
      return;
    }

    const customerUserId = authUsersResult.value.customer.userId;
    const seedNow = new Date();

    const categoriesResult = await seedCategoriesUseCase.execute();
    if (categoriesResult.isFailure) {
      throw categoriesResult.error;
    }
    const createdCategories = categoriesResult.value.filter(
      (category) => category.status === 'created',
    ).length;
    console.log(
      `Categories ready: ${categoriesResult.value.length} total (${createdCategories} created).`,
    );

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

    const ordersResult = await seedOrdersUseCase.execute({
      userId: customerUserId,
      products,
    });
    if (ordersResult.isFailure) {
      throw ordersResult.error;
    }
    const createdOrdersCount = ordersResult.value.filter(
      (order) => order.seedStatus === 'created',
    ).length;
    console.log(
      `Orders ready: ${ordersResult.value.length} total (${createdOrdersCount} created).`,
    );

    const paymentInputs = ordersResult.value
      .map((order) => {
        const meta = DEMO_PAYMENT_BY_REFERENCE[order.referenceName];
        if (!meta) {
          return null;
        }
        const createdAt = utcDaysAgo(seedNow, meta.daysAgo);
        return {
          orderId: order.id,
          userId: customerUserId,
          amount: order.totalPrice,
          currency: order.currency,
          paymentMethod: order.paymentMethod,
          createdAt,
          withPartialRefundAmount: meta.withPartialRefundAmount,
          linkCreatedAt: createdAt,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const paymentsResult = await seedPaymentsUseCase.execute(
      paymentInputs.map(
        ({
          orderId,
          userId,
          amount,
          currency,
          paymentMethod,
          createdAt,
          withPartialRefundAmount,
        }) => ({
          orderId,
          userId,
          amount,
          currency,
          paymentMethod,
          createdAt,
          withPartialRefundAmount,
        }),
      ),
    );
    if (paymentsResult.isFailure) {
      throw paymentsResult.error;
    }
    const createdPayments = paymentsResult.value.filter(
      (p) => p.seedStatus === 'created',
    ).length;
    console.log(
      `Payments ready: ${paymentsResult.value.length} total (${createdPayments} created).`,
    );

    const createdAtByOrderId = new Map(
      paymentInputs.map((p) => [p.orderId, p.linkCreatedAt]),
    );
    const linkItems = [
      ...paymentsResult.value.map((p) => ({
        orderId: p.orderId,
        paymentId: p.paymentId,
        createdAt: createdAtByOrderId.get(p.orderId) ?? seedNow,
      })),
      ...ordersResult.value
        .filter((order) => !DEMO_PAYMENT_BY_REFERENCE[order.referenceName])
        .map((order) => ({
          orderId: order.id,
          createdAt: utcDaysAgo(seedNow, 1),
        })),
    ];
    const linkResult = await linkOrderPaymentsUseCase.execute(linkItems);
    if (linkResult.isFailure) {
      throw linkResult.error;
    }
    console.log(`Order↔payment links ready: ${linkResult.value.length}.`);

    const inventoryLines = ordersResult.value.flatMap((order) => {
      const effect = inventoryEffectForStatus(order.status);
      if (!effect) {
        return [];
      }
      return order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        effect,
      }));
    });

    const inventorySyncResult = await seedInventoryFromOrdersUseCase.execute({
      baselines: products.map((product) => ({
        productId: product.id,
        availableQuantity: product.initialStock,
      })),
      lines: inventoryLines,
    });
    if (inventorySyncResult.isFailure) {
      throw inventorySyncResult.error;
    }
    console.log(
      `Inventory sync ready: ${inventorySyncResult.value.length} SKUs aligned to demo orders.`,
    );

    console.log('\nSeeding completed successfully.\n');
  } catch (error) {
    console.error(
      authOnly
        ? '\nUnexpected error during auth seeding:'
        : '\nUnexpected error during database seeding:',
      error,
    );
    process.exitCode = 1;
  } finally {
    if (app) await app.close();
  }
}

void bootstrap();
