import { MigrationInterface, QueryRunner } from 'typeorm';

export class AnalyticsQueryIndexes1787400000001 implements MigrationInterface {
  name = 'AnalyticsQueryIndexes1787400000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_orders_created_at" ON "orders" ("createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_orders_status_created_at" ON "orders" ("status", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_order_items_product_id" ON "order_items" ("product_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_payments_status_completed_at" ON "payments" ("status", "completed_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_payments_status_completed_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_order_items_product_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_orders_status_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_orders_created_at"`,
    );
  }
}
