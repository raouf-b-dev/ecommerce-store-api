// src/core/infrastructure/orm/id-generator.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { IdGeneratorService } from './id-generator.service';

describe('IdGeneratorService', () => {
  let service: IdGeneratorService;
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: jest.Mocked<QueryRunner>;

  beforeEach(async () => {
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      query: jest.fn(),
    } as any;

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner as any),
      query: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdGeneratorService,
        {
          provide: getDataSourceToken(),
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<IdGeneratorService>(IdGeneratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateOrderId', () => {
    it('should generate order ID with correct prefix and format', async () => {
      const mockResult = [{ current_value: 1 }];
      queryRunner.query.mockResolvedValue(mockResult);

      const result = await service.generateOrderId();

      expect(result).toBe('OR0000001');
      expect(queryRunner.connect).toHaveBeenCalledTimes(1);
      expect(queryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO id_sequences'),
        ['ORDER', 'OR'],
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('should generate order ID with incremented value', async () => {
      const mockResult = [{ current_value: 123 }];
      queryRunner.query.mockResolvedValue(mockResult);

      const result = await service.generateOrderId();

      expect(result).toBe('OR0000123');
    });

    it('should throw if result is missing or malformed', async () => {
      queryRunner.query.mockResolvedValue([]);
      await expect(service.generateOrderId()).rejects.toThrow(
        'Failed to retrieve current_value from id_sequences',
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.release).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();

      queryRunner.query.mockResolvedValue([{ current_value: 'not-a-number' }]);
      await expect(service.generateOrderId()).rejects.toThrow(
        'Failed to retrieve current_value from id_sequences',
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateProductId', () => {
    it('should generate product ID with correct prefix and format', async () => {
      const mockResult = [{ current_value: 42 }];
      queryRunner.query.mockResolvedValue(mockResult);

      const result = await service.generateProductId();

      expect(result).toBe('PR0000042');
      expect(queryRunner.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO id_sequences'),
        ['PRODUCT', 'PR'],
      );
    });
  });

  describe('generateCustomerId', () => {
    it('should generate customer ID with correct prefix and format', async () => {
      const mockResult = [{ current_value: 999 }];
      queryRunner.query.mockResolvedValue(mockResult);

      const result = await service.generateCustomerId();

      expect(result).toBe('CU0000999');
      expect(queryRunner.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO id_sequences'),
        ['CUSTOMER', 'CU'],
      );
    });
  });

  describe('generateId (private method)', () => {
    it('should handle large sequence numbers correctly', async () => {
      const mockResult = [{ current_value: 9999999 }];
      queryRunner.query.mockResolvedValue(mockResult);

      const result = await service.generateOrderId();

      expect(result).toBe('OR9999999');
    });

    it('should rollback transaction on database error', async () => {
      const dbError = new Error('Database connection failed');
      queryRunner.query.mockRejectedValue(dbError);

      queryRunner.rollbackTransaction.mockResolvedValue(undefined);

      await expect(service.generateOrderId()).rejects.toThrow(dbError);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.release).toHaveBeenCalledTimes(1);
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should rollback transaction on commit error', async () => {
      const mockResult = [{ current_value: 1 }];
      queryRunner.query.mockResolvedValue(mockResult);
      const commitError = new Error('Commit failed');
      queryRunner.commitTransaction.mockRejectedValue(commitError);

      await expect(service.generateOrderId()).rejects.toThrow(commitError);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('should release query runner even if rollback fails', async () => {
      const dbError = new Error('Database error');
      const rollbackError = new Error('Rollback failed');

      queryRunner.query.mockRejectedValue(dbError);
      queryRunner.rollbackTransaction.mockRejectedValue(rollbackError);

      await expect(service.generateOrderId()).rejects.toThrow(rollbackError);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('formatId (private method testing through public methods)', () => {
    it('should pad numbers correctly with leading zeros', async () => {
      const testCases = [
        { value: 1, expected: 'OR0000001' },
        { value: 12, expected: 'OR0000012' },
        { value: 123, expected: 'OR0000123' },
        { value: 1234, expected: 'OR0001234' },
        { value: 12345, expected: 'OR0012345' },
        { value: 123456, expected: 'OR0123456' },
        { value: 1234567, expected: 'OR1234567' },
      ];

      for (const testCase of testCases) {
        const mockResult = [{ current_value: testCase.value }];
        queryRunner.query.mockResolvedValue(mockResult);

        const result = await service.generateOrderId();

        expect(result).toBe(testCase.expected);
      }
    });
  });

  describe('getCurrentSequenceValue and resetSequence', () => {
    it('should return current sequence value when record exists', async () => {
      const mockResult = [{ current_value: 150 }];
      dataSource.query = jest.fn().mockResolvedValue(mockResult);

      const val = await service.getCurrentSequenceValue('ORDER');
      expect(val).toBe(150);
      expect((dataSource.query as jest.Mock).mock.calls[0][0]).toContain(
        'SELECT current_value',
      );
    });

    it('should return 0 when no record exists', async () => {
      dataSource.query = jest.fn().mockResolvedValue([]);
      const val = await service.getCurrentSequenceValue('NONEXISTENT');
      expect(val).toBe(0);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database query failed');
      dataSource.query = jest.fn().mockRejectedValue(dbError);
      await expect(service.getCurrentSequenceValue('ORDER')).rejects.toThrow(
        dbError,
      );
    });

    it('should reset sequence to specified value', async () => {
      dataSource.query = jest.fn().mockResolvedValue([]);
      await service.resetSequence('ORDER', 100);
      expect((dataSource.query as jest.Mock).mock.calls[0][0]).toContain(
        'UPDATE id_sequences',
      );
    });

    it('should reset sequence to default value (0) when no value provided', async () => {
      dataSource.query = jest.fn().mockResolvedValue([]);
      await service.resetSequence('ORDER');
      expect((dataSource.query as jest.Mock).mock.calls[0][0]).toContain(
        'UPDATE id_sequences',
      );
    });

    it('should handle database errors during reset', async () => {
      const dbError = new Error('Update failed');
      dataSource.query = jest.fn().mockRejectedValue(dbError);
      await expect(service.resetSequence('ORDER', 50)).rejects.toThrow(dbError);
    });
  });

  describe('Transaction handling', () => {
    it('should properly handle transaction lifecycle for successful operations', async () => {
      const mockResult = [{ current_value: 1 }];
      queryRunner.query.mockResolvedValue(mockResult);

      await service.generateOrderId();

      expect(queryRunner.connect).toHaveBeenCalledTimes(1);
      expect(queryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.query).toHaveBeenCalledTimes(1);
      expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.release).toHaveBeenCalledTimes(1);
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('should ensure query runner is always released', async () => {
      const mockResult = [{ current_value: 1 }];
      queryRunner.query.mockResolvedValue(mockResult);

      await service.generateOrderId();
      expect(queryRunner.release).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();
      queryRunner.query.mockRejectedValue(new Error('Test error'));
      queryRunner.rollbackTransaction.mockResolvedValue(undefined);

      try {
        await service.generateOrderId();
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(queryRunner.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should use parameterized queries to prevent SQL injection', async () => {
      const mockResult = [{ current_value: 1 }];
      queryRunner.query.mockResolvedValue(mockResult);

      await service.generateOrderId();

      const [query, params] = (queryRunner.query as jest.Mock).mock.calls[0];
      expect(query).toContain('$1');
      expect(query).toContain('$2');
      expect(params).toEqual(['ORDER', 'OR']);
    });
  });
});
