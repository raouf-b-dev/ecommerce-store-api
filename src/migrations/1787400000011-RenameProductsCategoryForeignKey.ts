import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddCategoriesTable1787339318500 created the products -> categories foreign
 * key as "FK_products_category", while the entity mapping (and every other
 * foreign key in the schema) uses the TypeORM DefaultNamingStrategy name, so
 * `migration:generate` kept proposing a drop and re-add. This renames the
 * constraint in place (metadata only, no table rewrite or revalidation). A
 * database that already has the generated name (for example one created with
 * synchronize) only drops the duplicate hand-named constraint.
 */
export class RenameProductsCategoryForeignKey1787400000011 implements MigrationInterface {
  name = 'RenameProductsCategoryForeignKey1787400000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_products_category'
        ) THEN
          IF EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'FK_9a5f6868c96e0069e699f33e124'
          ) THEN
            ALTER TABLE "products" DROP CONSTRAINT "FK_products_category";
          ELSE
            ALTER TABLE "products" RENAME CONSTRAINT "FK_products_category" TO "FK_9a5f6868c96e0069e699f33e124";
          END IF;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_9a5f6868c96e0069e699f33e124'
        ) AND NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_products_category'
        ) THEN
          ALTER TABLE "products" RENAME CONSTRAINT "FK_9a5f6868c96e0069e699f33e124" TO "FK_products_category";
        END IF;
      END $$
    `);
  }
}
