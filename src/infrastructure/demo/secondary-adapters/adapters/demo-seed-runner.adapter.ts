import { Injectable } from '@nestjs/common';
import { EnvConfigService } from '../../../../config/env-config.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../shared-kernel/domain/exceptions/usecase.error';
import { SeedDemoAuthUsersUseCase } from '../../../../modules/authentication/core/application/seed/seed-demo-auth-users.usecase';
import { SeedDemoCartUseCase } from '../../../../modules/carts/core/application/seed/seed-demo-cart.usecase';
import {
  SeedDemoInventoryEffectLine,
  SeedDemoInventoryFromOrdersUseCase,
} from '../../../../modules/inventory/core/application/seed/seed-demo-inventory-from-orders.usecase';
import { SeedDemoInventoryUseCase } from '../../../../modules/inventory/core/application/seed/seed-demo-inventory.usecase';
import { DEMO_SEED_ORDERS } from '../../../../modules/orders/core/application/seed/demo-orders';
import { LinkDemoOrderPaymentsUseCase } from '../../../../modules/orders/core/application/seed/link-demo-order-payments.usecase';
import { SeedDemoOrdersUseCase } from '../../../../modules/orders/core/application/seed/seed-demo-orders.usecase';
import {
  DEMO_PAYMENT_BY_REFERENCE,
  utcDaysAgo,
} from '../../../../modules/payments/core/application/seed/demo-payments';
import { SeedDemoPaymentsUseCase } from '../../../../modules/payments/core/application/seed/seed-demo-payments.usecase';
import {
  SeededDemoProduct,
  SeedDemoCatalogUseCase,
} from '../../../../modules/products/core/application/seed/seed-demo-catalog.usecase';
import { SeedDemoCategoriesUseCase } from '../../../../modules/products/core/application/seed/seed-demo-categories.usecase';
import {
  DemoSeedReport,
  DemoSeedRunner,
  DemoSeedRunOptions,
} from '../../core/application/ports/demo-seed-runner.port';

interface CustomerFixturesReport {
  cartItems: number;
  orders: number;
  ordersCreated: number;
  payments: number;
  paymentsCreated: number;
  links: number;
  inventoryLines: SeedDemoInventoryEffectLine[];
}

const NO_CUSTOMER_FIXTURES: CustomerFixturesReport = {
  cartItems: 0,
  orders: 0,
  ordersCreated: 0,
  payments: 0,
  paymentsCreated: 0,
  links: 0,
  inventoryLines: [],
};

function inventoryEffectForStatus(status: string): 'hold' | 'consume' | null {
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

/**
 * Same pipeline as `npm run db:seed`. Inventory is rebuilt from the fixture
 * order lines (not every order on the demo customer) so a public checkout
 * cannot permanently drain stock. Shopper-created accounts and orders stay.
 * When the auth seed creates no demo customer (DEMO_READ_ONLY), the cart,
 * order, and payment fixtures are skipped and stock resets to the catalog
 * baseline.
 */
@Injectable()
export class DemoSeedRunnerAdapter extends DemoSeedRunner {
  constructor(
    private readonly config: EnvConfigService,
    private readonly seedAuthUsersUseCase: SeedDemoAuthUsersUseCase,
    private readonly seedCategoriesUseCase: SeedDemoCategoriesUseCase,
    private readonly seedCatalogUseCase: SeedDemoCatalogUseCase,
    private readonly seedInventoryUseCase: SeedDemoInventoryUseCase,
    private readonly seedCartUseCase: SeedDemoCartUseCase,
    private readonly seedOrdersUseCase: SeedDemoOrdersUseCase,
    private readonly seedPaymentsUseCase: SeedDemoPaymentsUseCase,
    private readonly linkOrderPaymentsUseCase: LinkDemoOrderPaymentsUseCase,
    private readonly seedInventoryFromOrdersUseCase: SeedDemoInventoryFromOrdersUseCase,
  ) {
    super();
  }

  async run(
    options: DemoSeedRunOptions,
  ): Promise<Result<DemoSeedReport, UseCaseError>> {
    const authUsersResult = await this.seedAuthUsersUseCase.execute({
      readOnly: this.config.demo.readOnly,
      accounts: this.config.demo.accounts,
    });
    if (authUsersResult.isFailure) {
      return authUsersResult;
    }

    const auth = authUsersResult.value;
    const empty: DemoSeedReport = {
      authOnly: options.authOnly,
      superAdmin: auth.superAdmin,
      admin: auth.admin,
      viewer: auth.viewer,
      customer: auth.customer,
      categories: 0,
      categoriesCreated: 0,
      products: 0,
      productsCreated: 0,
      inventory: 0,
      inventoryCreated: 0,
      cartItems: 0,
      orders: 0,
      ordersCreated: 0,
      payments: 0,
      paymentsCreated: 0,
      links: 0,
      inventorySynced: 0,
    };

    if (options.authOnly) {
      return Result.success(empty);
    }

    const categoriesResult = await this.seedCategoriesUseCase.execute();
    if (categoriesResult.isFailure) {
      return categoriesResult;
    }

    const catalogResult = await this.seedCatalogUseCase.execute({
      publicBaseUrl: this.config.http.publicBaseUrl,
    });
    if (catalogResult.isFailure) {
      return catalogResult;
    }

    const products = catalogResult.value;
    const inventoryResult = await this.seedInventoryUseCase.execute(
      products.map((product) => ({
        productId: product.id,
        sku: product.sku,
        initialStock: product.initialStock,
        lowStockThreshold: product.lowStockThreshold,
      })),
    );
    if (inventoryResult.isFailure) {
      return inventoryResult;
    }

    const fixturesResult = auth.customer
      ? await this.seedCustomerFixtures(auth.customer.userId, products)
      : Result.success<CustomerFixturesReport>(NO_CUSTOMER_FIXTURES);
    if (fixturesResult.isFailure) {
      return fixturesResult;
    }
    const fixtures = fixturesResult.value;

    const inventorySyncResult =
      await this.seedInventoryFromOrdersUseCase.execute({
        baselines: products.map((product) => ({
          productId: product.id,
          availableQuantity: product.initialStock,
        })),
        lines: fixtures.inventoryLines,
      });
    if (inventorySyncResult.isFailure) {
      return inventorySyncResult;
    }

    return Result.success({
      authOnly: false,
      superAdmin: auth.superAdmin,
      admin: auth.admin,
      viewer: auth.viewer,
      customer: auth.customer,
      categories: categoriesResult.value.length,
      categoriesCreated: categoriesResult.value.filter(
        (category) => category.status === 'created',
      ).length,
      products: products.length,
      productsCreated: products.filter(
        (product) => product.status === 'created',
      ).length,
      inventory: inventoryResult.value.length,
      inventoryCreated: inventoryResult.value.filter(
        (item) => item.status === 'created',
      ).length,
      cartItems: fixtures.cartItems,
      orders: fixtures.orders,
      ordersCreated: fixtures.ordersCreated,
      payments: fixtures.payments,
      paymentsCreated: fixtures.paymentsCreated,
      links: fixtures.links,
      inventorySynced: inventorySyncResult.value.length,
    });
  }

  /** Cart, orders, and payments owned by the seeded local demo customer. */
  private async seedCustomerFixtures(
    userId: number,
    products: SeededDemoProduct[],
  ): Promise<Result<CustomerFixturesReport, UseCaseError>> {
    const cartResult = await this.seedCartUseCase.execute({
      userId: userId,
      products,
    });
    if (cartResult.isFailure) {
      return cartResult;
    }

    const ordersResult = await this.seedOrdersUseCase.execute({
      userId: userId,
      products,
    });
    if (ordersResult.isFailure) {
      return ordersResult;
    }

    const seedNow = new Date();
    const paymentInputs = ordersResult.value.flatMap((order) => {
      const meta = DEMO_PAYMENT_BY_REFERENCE[order.referenceName];
      if (!meta) {
        return [];
      }
      const createdAt = utcDaysAgo(seedNow, meta.daysAgo);
      return [
        {
          orderId: order.id,
          userId: userId,
          amount: order.totalPrice,
          currency: order.currency,
          paymentMethod: order.paymentMethod,
          createdAt,
          withPartialRefundAmount: meta.withPartialRefundAmount,
          linkCreatedAt: createdAt,
        },
      ];
    });

    const paymentsResult = await this.seedPaymentsUseCase.execute(
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
      return paymentsResult;
    }

    const createdAtByOrderId = new Map(
      paymentInputs.map((payment) => [payment.orderId, payment.linkCreatedAt]),
    );
    const linkItems = [
      ...paymentsResult.value.map((payment) => ({
        orderId: payment.orderId,
        paymentId: payment.paymentId,
        createdAt: createdAtByOrderId.get(payment.orderId) ?? seedNow,
      })),
      ...ordersResult.value
        .filter((order) => !DEMO_PAYMENT_BY_REFERENCE[order.referenceName])
        .map((order) => ({
          orderId: order.id,
          createdAt: utcDaysAgo(seedNow, 1),
        })),
    ];
    const linkResult = await this.linkOrderPaymentsUseCase.execute(linkItems);
    if (linkResult.isFailure) {
      return linkResult;
    }

    const idBySku = new Map(
      products.map((product) => [product.sku, product.id]),
    );
    const inventoryLines = DEMO_SEED_ORDERS.flatMap((order) => {
      const effect = inventoryEffectForStatus(order.targetStatus);
      if (!effect) {
        return [];
      }
      return order.items.flatMap((item) => {
        const productId = idBySku.get(item.sku);
        if (productId == null) {
          return [];
        }
        return [{ productId, quantity: item.quantity, effect }];
      });
    });

    return Result.success({
      cartItems: cartResult.value.itemCount,
      orders: ordersResult.value.length,
      ordersCreated: ordersResult.value.filter(
        (order) => order.seedStatus === 'created',
      ).length,
      payments: paymentsResult.value.length,
      paymentsCreated: paymentsResult.value.filter(
        (payment) => payment.seedStatus === 'created',
      ).length,
      links: linkResult.value.length,
      inventoryLines,
    });
  }
}
