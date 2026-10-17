import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCartItemSku1787400000008 implements MigrationInterface {
  name = 'AddCartItemSku1787400000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cart_items"
      ADD COLUMN "sku" character varying NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cart_items"
      DROP COLUMN "sku"
    `);
  }
}
