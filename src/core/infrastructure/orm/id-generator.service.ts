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

  async generateCustomerId(): Promise<string> {
    return this.generateId('CUSTOMER', 'CU');
  }

  private async generateId(
    entityType: string,
    prefix: string,
  ): Promise<string> {
    // Use a transaction to ensure thread safety
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await queryRunner.query(
        `
        INSERT INTO id_sequences (entity_type, prefix, current_value, created_at, updated_at)
        VALUES ($1, $2, 1, NOW(), NOW())
        ON CONFLICT (entity_type) 
        DO UPDATE SET 
          current_value = id_sequences.current_value + 1,
          updated_at = NOW()
        RETURNING current_value
      `,
        [entityType, prefix],
      );

      await queryRunner.commitTransaction();

      const currentValue = result[0].current_value;
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

    return result.length > 0 ? result[0].current_value : 0;
  }

  // Helper method to reset sequence (useful for testing)
  async resetSequence(entityType: string, value: number = 0): Promise<void> {
    await this.dataSource.query(
      'UPDATE id_sequences SET current_value = $1, updated_at = NOW() WHERE entity_type = $2',
      [value, entityType],
    );
  }
}
