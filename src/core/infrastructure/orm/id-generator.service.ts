// src/core/services/id-generator.service.ts
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface IdSequence {
  id: number;
  entity_type: string;
  prefix: string;
  current_value: number;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class IdGeneratorService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async generateOrderId(): Promise<string> {
    return this.generateId('ORDER', 'OR');
  }

  async generateProductId(): Promise<string> {
    return this.generateId('PRODUCT', 'PR');
  }

  async generateInventoryId(): Promise<string> {
    return this.generateId('INVENTORY', 'IN');
  }

  async generateCustomerId(): Promise<string> {
    return this.generateId('CUSTOMER', 'CU');
  }

  async generateShippingAddressId(): Promise<string> {
    return this.generateId('SHIPPINGADDRESS', 'SA');
  }

  async generatePaymentId(): Promise<string> {
    return this.generateId('PAYMENT', 'PA');
  }

  async generateCartId(): Promise<string> {
    return this.generateId('CART', 'CA');
  }

  async generateRefundId(): Promise<string> {
    return this.generateId('REFUND', 'RE');
  }

  async generateUserId(): Promise<string> {
    return this.generateId('USER', 'US');
  }

  private async generateId(
    entityType: string,
    prefix: string,
  ): Promise<string> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const rawResult = await queryRunner.query(
        `INSERT INTO id_sequences (entity_type, prefix, current_value, created_at, updated_at)
         VALUES ($1, $2, 1, NOW(), NOW())
         ON CONFLICT (entity_type)
         DO UPDATE SET current_value = id_sequences.current_value + 1,
                       updated_at = NOW()
         RETURNING current_value`,
        [entityType, prefix],
      );

      await queryRunner.commitTransaction();

      // Handle both string and number types from PostgreSQL
      const result = rawResult as Array<{ current_value: number | string }>;

      if (!result[0] || result[0].current_value == null) {
        throw new Error('Failed to retrieve current_value from id_sequences');
      }

      // Convert to number if it's a string
      const currentValue =
        typeof result[0].current_value === 'string'
          ? parseInt(result[0].current_value, 10)
          : result[0].current_value;

      if (isNaN(currentValue)) {
        throw new Error('Invalid current_value received from database');
      }

      return this.formatId(prefix, currentValue);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private formatId(prefix: string, value: number): string {
    return `${prefix}${value.toString().padStart(7, '0')}`;
  }

  // Helper method to get current sequence value (useful for testing)
  async getCurrentSequenceValue(entityType: string): Promise<number> {
    const result = await this.dataSource.query(
      'SELECT current_value FROM id_sequences WHERE entity_type = $1',
      [entityType],
    );

    if (result.length === 0) return 0;

    const value = result[0].current_value;
    return typeof value === 'string' ? parseInt(value, 10) : value;
  }

  // Helper method to reset sequence (useful for testing)
  async resetSequence(entityType: string, value: number = 0): Promise<void> {
    await this.dataSource.query(
      'UPDATE id_sequences SET current_value = $1, updated_at = NOW() WHERE entity_type = $2',
      [value, entityType],
    );
  }
}
