import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentProviderAndCardMethod1787400000005 implements MigrationInterface {
  name = 'PaymentProviderAndCardMethod1787400000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
