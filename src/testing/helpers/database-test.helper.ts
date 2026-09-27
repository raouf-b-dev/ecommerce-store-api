import { DataSource, QueryRunner } from 'typeorm';

export interface DatabaseCleanupOptions {
  excludeTables?: string[];
  resetIdentity?: boolean;
}

export class DatabaseTestHelper {
  static async initDataSource(dataSource: DataSource): Promise<DataSource> {
    this.ensureTestEnvironment();

    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    return dataSource;
  }

  static async destroyDataSource(dataSource: DataSource): Promise<void> {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }

  /**
   * Truncates all tables in the connected database to ensure a clean state between tests.
   * NOTE: This uses CASCADE, which will wipe all relational data.
   * It should ONLY be used in test environments against a dedicated test database container.
   */
  static async clearDatabase(
    dataSource: DataSource,
    options: DatabaseCleanupOptions = {},
  ): Promise<void> {
    this.ensureTestEnvironment();

    if (!dataSource.isInitialized) {
      throw new Error('DataSource is not initialized. Cannot clear database.');
    }

    const excluded = new Set(options.excludeTables ?? []);
    const tableNames = dataSource.entityMetadatas
      .filter(
        (metadata) =>
          !excluded.has(metadata.tableName) &&
          !excluded.has(metadata.tablePath),
      )
      .map((metadata) => this.quoteTablePath(metadata.tablePath));

    if (tableNames.length === 0) {
      return;
    }

    const resetIdentity = options.resetIdentity !== false;
    const resetIdentityClause = resetIdentity ? ' RESTART IDENTITY' : '';

    await dataSource.query(
      `TRUNCATE TABLE ${tableNames.join(', ')}${resetIdentityClause} CASCADE;`,
    );
  }

  /**
   * Runs work in an explicit transaction and always rolls it back.
   * Useful for integration tests that need transaction semantics without persistent side effects.
   */
  static async withRollbackTransaction<T>(
    dataSource: DataSource,
    run: (queryRunner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    this.ensureTestEnvironment();

    if (!dataSource.isInitialized) {
      throw new Error(
        'DataSource is not initialized. Cannot start transaction.',
      );
    }

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      return await run(queryRunner);
    } finally {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      await queryRunner.release();
    }
  }

  private static ensureTestEnvironment(): void {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        'DatabaseTestHelper can only be used when NODE_ENV is "test".',
      );
    }
  }

  private static quoteTablePath(tablePath: string): string {
    return tablePath
      .split('.')
      .map((part) => `"${part.replace(/"/g, '""')}"`)
      .join('.');
  }
}
