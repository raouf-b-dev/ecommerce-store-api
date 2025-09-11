import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIdSequences1757497738140 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.id_sequences (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(100) UNIQUE NOT NULL,
        prefix VARCHAR(10) NOT NULL,
        current_value BIGINT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS public.id_sequences;
    `);
  }
}
