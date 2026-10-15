import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryStockCheckConstraints1787400000003 implements MigrationInterface {
  name = 'AddInventoryStockCheckConstraints1787400000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "inventory"
      ADD CONSTRAINT "chk_inventory_available_quantity" CHECK ("availableQuantity" >= 0)
    `);
    await queryRunner.query(`
      ALTER TABLE "inventory"
      ADD CONSTRAINT "chk_inventory_reserved_quantity" CHECK ("reservedQuantity" >= 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "inventory"
      DROP CONSTRAINT "chk_inventory_reserved_quantity"
    `);
    await queryRunner.query(`
      ALTER TABLE "inventory"
      DROP CONSTRAINT "chk_inventory_available_quantity"
    `);
  }
}
