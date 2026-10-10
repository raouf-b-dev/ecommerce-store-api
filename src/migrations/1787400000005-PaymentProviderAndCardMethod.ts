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
  return 0;
}

export class PaymentProviderAndCardMethod1787400000005 implements MigrationInterface {
  name = 'PaymentProviderAndCardMethod1787400000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const invalidPaymentsRaw = await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM "payments"
      WHERE "payment_method" NOT IN ('STRIPE', 'CARD')
    `);
    const invalidOrdersRaw = await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM "orders"
      WHERE "payment_method" NOT IN ('STRIPE', 'CARD')
    `);
    const invalidPaymentsCount = parseCountResult(invalidPaymentsRaw);
    const invalidOrdersCount = parseCountResult(invalidOrdersRaw);

    if (invalidPaymentsCount > 0 || invalidOrdersCount > 0) {
      throw new Error(
        `Cannot migrate payment_method: found ${invalidPaymentsCount} payments and ${invalidOrdersCount} orders with unsupported payment_method (expected 'STRIPE' or 'CARD')`,
      );
    }

    const duplicatePendingRaw = await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT "order_id"
        FROM "payments"
        WHERE "status" = 'PENDING'
        GROUP BY "order_id"
        HAVING COUNT(*) > 1
      ) duplicates
    `);
    const duplicatePendingCount = parseCountResult(duplicatePendingRaw);

    if (duplicatePendingCount > 0) {
      throw new Error(
        `Cannot apply pending payment unique index: found ${duplicatePendingCount} orders with more than one PENDING payment`,
      );
    }

    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD COLUMN IF NOT EXISTS "provider" character varying
    `);
    await queryRunner.query(`
      UPDATE "payments"
      SET "provider" = 'stripe'
      WHERE "provider" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "payments"
      ALTER COLUMN "provider" SET NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "payments"
      SET "payment_method" = 'CARD'
      WHERE "payment_method" = 'STRIPE'
    `);
    await queryRunner.query(`
      UPDATE "orders"
      SET "payment_method" = 'CARD'
      WHERE "payment_method" = 'STRIPE'
    `);

    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD CONSTRAINT "chk_payments_payment_method" CHECK ("payment_method" IN ('CARD'))
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD CONSTRAINT "chk_orders_payment_method" CHECK ("payment_method" IN ('CARD'))
    `);
    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD CONSTRAINT "chk_payments_provider" CHECK ("provider" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_payments_order_id_pending_unique" ON "payments" ("order_id") WHERE "status" = 'PENDING'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_payments_order_id_pending_unique"
    `);
    await queryRunner.query(`
      ALTER TABLE "payments"
      DROP CONSTRAINT IF EXISTS "chk_payments_provider"
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP CONSTRAINT IF EXISTS "chk_orders_payment_method"
    `);
    await queryRunner.query(`
      ALTER TABLE "payments"
      DROP CONSTRAINT IF EXISTS "chk_payments_payment_method"
    `);

    await queryRunner.query(`
      UPDATE "orders"
      SET "payment_method" = 'STRIPE'
      WHERE "payment_method" = 'CARD'
    `);
    await queryRunner.query(`
      UPDATE "payments"
      SET "payment_method" = 'STRIPE'
      WHERE "payment_method" = 'CARD'
    `);
    await queryRunner.query(`
      ALTER TABLE "payments"
      DROP COLUMN IF EXISTS "provider"
    `);
  }
}
