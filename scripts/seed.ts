import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DemoSeedRunner } from '../src/infrastructure/demo/core/application/ports/demo-seed-runner.port';
import { maskEmail, statusLabel } from './utils/log-helpers';

const authOnly = process.argv.includes('--auth-only');

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
    const runner = app.get(DemoSeedRunner);

    console.log(
      authOnly
        ? '\n--- Re-seeding demo auth users (e2e prep) ---'
        : '\n--- Starting Local Database Seeding ---',
    );

    const reportResult = await runner.run({ authOnly });
    if (reportResult.isFailure) {
      throw reportResult.error;
    }
    const report = reportResult.value;

    if (report.superAdmin) {
      console.log(
        `Super admin user ${statusLabel(report.superAdmin.status)}: ${maskEmail(
          report.superAdmin.email,
        )}`,
      );
    }
    if (report.admin) {
      console.log(
        `Admin user ${statusLabel(report.admin.status)}: ${maskEmail(
          report.admin.email,
        )}`,
      );
    }
    if (report.viewer) {
      console.log(
        `Viewer user ${statusLabel(report.viewer.status)}: ${maskEmail(
          report.viewer.email,
        )}`,
      );
    }
    if (report.customer) {
      console.log(
        `Customer user ${statusLabel(report.customer.status)}: ${maskEmail(
          report.customer.email,
        )}`,
      );
    }

    if (authOnly) {
      console.log('\nAuth seed completed successfully.\n');
      return;
    }

    console.log(
      `Categories ready: ${report.categories} total (${report.categoriesCreated} created).`,
    );
    console.log(
      `Products ready: ${report.products} total (${report.productsCreated} created).`,
    );
    console.log(
      `Inventory ready: ${report.inventory} total (${report.inventoryCreated} created).`,
    );
    console.log(`Cart ready: ${report.cartItems} items.`);
    console.log(
      `Orders ready: ${report.orders} total (${report.ordersCreated} created).`,
    );
    console.log(
      `Payments ready: ${report.payments} total (${report.paymentsCreated} created).`,
    );
    console.log(`Order-payment links ready: ${report.links}.`);
    console.log(
      `Inventory sync ready: ${report.inventorySynced} SKUs aligned to demo order fixtures.`,
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
