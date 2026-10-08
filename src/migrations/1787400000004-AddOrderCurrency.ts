import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderCurrency1787400000004 implements MigrationInterface {
  name = 'AddOrderCurrency1787400000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN "currency" character varying(3) NOT NULL DEFAULT 'USD'
    `);
    await queryRunner.query(`
      ALTER TABLE "order_items"
      ADD COLUMN "currency" character varying(3) NOT NULL DEFAULT 'USD'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order_items"
      DROP COLUMN "currency"
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP COLUMN "currency"
    `);
  }
}
