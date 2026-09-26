// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { seedReferenceData, SeededData } from './seed-reference-data';

export class IntegrationTestHelper {
  static getDataSource(): DataSource {
    if (!globalThis.__INTEGRATION_DATA_SOURCE__) {
      throw new Error(
        'Integration DataSource has not been initialized. Ensure testcontainers.setup.ts is loaded.',
      );
    }
    return globalThis.__INTEGRATION_DATA_SOURCE__;
  }

  static getRepository<Entity extends ObjectLiteral>(
    target: EntityTarget<Entity>,
  ): Repository<Entity> {
    return this.getDataSource().getRepository(target);
  }

  static async clearDatabase(): Promise<void> {
    const dataSource = this.getDataSource();
    const entities = dataSource.entityMetadatas;
    const tableNames = entities.map((e) => `"${e.tableName}"`).join(', ');

    if (tableNames.length > 0) {
      await dataSource.query(
        `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`,
      );
    }
  }

  static async seedReferenceData(): Promise<SeededData> {
    return seedReferenceData(this.getDataSource());
  }
}
