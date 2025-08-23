// src/migrations/[timestamp]-create-tables-with-prefixed-ids.ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTablesWithPrefixedIds1692000000001
  implements MigrationInterface
{
  name = 'CreateTablesWithPrefixedIds1692000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create products table with string ID
    await queryRunner.createTable(
      new Table({
        name: 'products',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'sku',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'stockQuantity',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create orders table with string ID
    await queryRunner.createTable(
      new Table({
        name: 'orders',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
          },
          {
            name: 'customerId',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'pending'",
          },
          {
            name: 'totalPrice',
            type: 'numeric',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_ORDERS_CUSTOMER_ID',
            columnNames: ['customerId'],
          },
          {
            name: 'IDX_ORDERS_STATUS',
            columnNames: ['status'],
          },
          {
            name: 'IDX_ORDERS_CREATED_AT',
            columnNames: ['createdAt'],
          },
        ],
      }),
      true,
    );

    // Create order_items table
    await queryRunner.createTable(
      new Table({
        name: 'order_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'productId',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'productName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'unitPrice',
            type: 'numeric',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'quantity',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'lineTotal',
            type: 'numeric',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'order_id',
            type: 'varchar',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            name: 'FK_order_items_order',
            columnNames: ['order_id'],
            referencedTableName: 'orders',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_ORDER_ITEMS_ORDER_ID',
            columnNames: ['order_id'],
          },
          {
            name: 'IDX_ORDER_ITEMS_PRODUCT_ID',
            columnNames: ['productId'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('order_items');
    await queryRunner.dropTable('orders');
    await queryRunner.dropTable('products');
  }
}
