import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoriesTable1787339318500 implements MigrationInterface {
  name = 'AddCategoriesTable1787339318500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "categories" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "slug" character varying NOT NULL, "description" character varying, "is_active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_categories_slug" ON "categories" ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_categories_active" ON "categories" ("is_active") `,
    );
    await queryRunner.query(
      `INSERT INTO "categories" ("id", "name", "slug", "description", "is_active") VALUES (1, 'Electronics', 'electronics', NULL, true), (2, 'Clothing', 'clothing', NULL, true), (3, 'Home & Garden', 'home-garden', NULL, true), (4, 'Sports', 'sports', NULL, true), (5, 'Books', 'books', NULL, true) ON CONFLICT ("id") DO NOTHING`,
    );
    await queryRunner.query(
      `SELECT setval(pg_get_serial_sequence('categories', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM "categories"), 5))`,
    );
    await queryRunner.query(
      `UPDATE "products" SET "category_id" = NULL WHERE "category_id" IS NOT NULL AND "category_id" NOT IN (1, 2, 3, 4, 5)`,
    );
    await queryRunner.query(
      `DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_products_category'
        ) THEN
          ALTER TABLE "products" ADD CONSTRAINT "FK_products_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL;
        END IF;
      END $$`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_products_category"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "categories"`);
  }
}
