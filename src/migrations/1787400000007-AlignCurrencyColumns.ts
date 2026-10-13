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

export class AlignCurrencyColumns1787400000007 implements MigrationInterface {
  name = 'AlignCurrencyColumns1787400000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const invalidCurrencyRaw = await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM "products"
      WHERE length("currency") > 3
    `);
    const invalidCount = parseCountResult(invalidCurrencyRaw);

    if (invalidCount > 0) {
      throw new Error(
        `Cannot align products currency column: found ${invalidCount} products with currency length greater than 3`,
      );
    }

    await queryRunner.query(`
      ALTER TABLE "products" ALTER COLUMN "currency" TYPE character varying(3);
      ALTER TABLE "products" ALTER COLUMN "currency" DROP DEFAULT;
      ALTER TABLE "cart_items" ALTER COLUMN "currency" DROP DEFAULT;
      ALTER TABLE "orders" ALTER COLUMN "currency" DROP DEFAULT;
      ALTER TABLE "order_items" ALTER COLUMN "currency" DROP DEFAULT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order_items" ALTER COLUMN "currency" SET DEFAULT 'USD';
      ALTER TABLE "orders" ALTER COLUMN "currency" SET DEFAULT 'USD';
      ALTER TABLE "cart_items" ALTER COLUMN "currency" SET DEFAULT 'USD';
      ALTER TABLE "products" ALTER COLUMN "currency" SET DEFAULT 'USD';
      ALTER TABLE "products" ALTER COLUMN "currency" TYPE character varying;
    `);
  }
}
