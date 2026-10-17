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

export class OrderItemProductNameWhitespace1787400000010 implements MigrationInterface {
  name = 'OrderItemProductNameWhitespace1787400000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "order_items" oi
      SET "product_name" = btrim(p."name")
      FROM "products" p
      WHERE p."id" = oi."product_id"
        AND oi."product_name" !~ '[^[:space:]]'
        AND p."name" ~ '[^[:space:]]'
    `);

    const blankNameRaw = await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM "order_items"
      WHERE "product_name" !~ '[^[:space:]]'
    `);
    const blankCount = parseCountResult(blankNameRaw);

    if (blankCount > 0) {
      throw new Error(
        `Cannot require non-blank order item product names: found ${blankCount} order_items with blank product_name; fix those rows manually`,
      );
    }

    await queryRunner.query(`
      ALTER TABLE "order_items"
      DROP CONSTRAINT "CHK_order_items_product_name_not_blank"
    `);
    await queryRunner.query(`
      ALTER TABLE "order_items"
      ADD CONSTRAINT "CHK_order_items_product_name_not_blank"
      CHECK ("product_name" ~ '[^[:space:]]')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order_items"
      DROP CONSTRAINT "CHK_order_items_product_name_not_blank"
    `);
    await queryRunner.query(`
      ALTER TABLE "order_items"
      ADD CONSTRAINT "CHK_order_items_product_name_not_blank"
      CHECK (btrim("product_name") <> '')
    `);
  }
}
