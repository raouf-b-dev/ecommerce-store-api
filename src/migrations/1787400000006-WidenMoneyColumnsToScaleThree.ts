import { MigrationInterface, QueryRunner } from 'typeorm';

function parseCountResult(result: unknown): number {
  if (
    Array.isArray(result) &&
    result.length > 0 &&
    typeof result[0] === 'object' &&
    result[0] !== null &&
    'count' in result[0]
  ) {
    const raw = result[0].count;
    const n = Number(raw);
    if (!Number.isNaN(n)) {
      return n;
    }
  }
  throw new Error('Unexpected query count result shape from database');
}

export class WidenMoneyColumnsToScaleThree1787400000006 implements MigrationInterface {
  name = 'WidenMoneyColumnsToScaleThree1787400000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "price" TYPE numeric(13,3)`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ALTER COLUMN "price" TYPE numeric(13,3)`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ALTER COLUMN "unitPrice" TYPE numeric(13,3)`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ALTER COLUMN "lineTotal" TYPE numeric(13,3)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "subtotal" TYPE numeric(13,3)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "shippingCost" TYPE numeric(13,3)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "totalPrice" TYPE numeric(13,3)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "amount" TYPE numeric(11,3)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "refunded_amount" TYPE numeric(11,3)`,
    );
    await queryRunner.query(
      `ALTER TABLE "refunds" ALTER COLUMN "amount" TYPE numeric(11,3)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const checks = [
      { table: 'products', column: 'price' },
      { table: 'cart_items', column: 'price' },
      { table: 'order_items', column: 'unitPrice' },
      { table: 'order_items', column: 'lineTotal' },
      { table: 'orders', column: 'subtotal' },
      { table: 'orders', column: 'shippingCost' },
      { table: 'orders', column: 'totalPrice' },
      { table: 'payments', column: 'amount' },
      { table: 'payments', column: 'refunded_amount' },
      { table: 'refunds', column: 'amount' },
    ];

    for (const { table, column } of checks) {
      const raw = await queryRunner.query(`
        SELECT COUNT(*)::int AS count
        FROM "${table}"
        WHERE ROUND("${column}", 2) != "${column}"
      `);
      const count = parseCountResult(raw);
      if (count > 0) {
        throw new Error(
          `Cannot revert scale-3 money columns: found ${count} rows in "${table}"."${column}" with non-zero third decimal place`,
        );
      }
    }

    await queryRunner.query(
      `ALTER TABLE "refunds" ALTER COLUMN "amount" TYPE numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "refunded_amount" TYPE numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "amount" TYPE numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "totalPrice" TYPE numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "shippingCost" TYPE numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "subtotal" TYPE numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ALTER COLUMN "lineTotal" TYPE numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ALTER COLUMN "unitPrice" TYPE numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ALTER COLUMN "price" TYPE numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "price" TYPE numeric(12,2)`,
    );
  }
}
