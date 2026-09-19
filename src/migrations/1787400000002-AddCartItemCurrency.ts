import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCartItemCurrency1787400000002 implements MigrationInterface {
  name = 'AddCartItemCurrency1787400000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cart_items"
      ADD COLUMN "currency" character varying(3) NOT NULL DEFAULT 'USD'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cart_items"
      DROP COLUMN "currency"
    `);
  }
}
