// src/migrations/[timestamp]-create-id-sequences-table.ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateIdSequencesTable1692000000000 implements MigrationInterface {
  name = 'CreateIdSequencesTable1692000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'id_sequences',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'entity_type',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'prefix',
            type: 'varchar',
            length: '10',
          },
          {
            name: 'current_value',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_ID_SEQUENCES_ENTITY_TYPE',
            columnNames: ['entity_type'],
          },
        ],
      }),
      true,
    );

    // Initialize sequences for our entities
    await queryRunner.query(`
      INSERT INTO id_sequences (entity_type, prefix, current_value, created_at, updated_at)
      VALUES 
        ('PRODUCT', 'PR', 0, NOW(), NOW()),
        ('ORDER', 'OR', 0, NOW(), NOW())
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('id_sequences');
  }
}
