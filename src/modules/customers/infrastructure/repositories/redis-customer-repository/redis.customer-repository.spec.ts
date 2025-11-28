import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Result } from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { CacheService } from '../../../../../core/infrastructure/redis/cache/cache.service';
import { CUSTOMER_REDIS } from '../../../../../core/infrastructure/redis/constants/redis.constants';
import { Customer } from '../../../domain/entities/customer';
import { CustomerRepository } from '../../../domain/repositories/customer.repository';
import { CustomerTestFactory } from '../../../testing/factories/customer.factory';
import { MockCustomerRepository } from '../../../testing/mocks/customer-repository.mock';
import { CustomerCacheMapper } from '../../persistence/mappers/customer.mapper';
import { RedisCustomerRepository } from './redis.customer-repository';

describe('RedisCustomerRepository', () => {
  let repository: RedisCustomerRepository;
  let cacheService: CacheService;
  let postgresRepo: MockCustomerRepository;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
    setAll: jest.fn(),
  };

  beforeEach(async () => {
    postgresRepo = new MockCustomerRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCustomerRepository,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: CustomerRepository, // This is technically incorrect as we are injecting it as postgresRepo, but for unit test it's fine if we handle the injection correctly in the constructor or use a token.
          // However, in the implementation: constructor(..., private readonly postgresRepo: CustomerRepository, ...)
          // NestJS testing module will inject this provider into that argument.
          useValue: postgresRepo,
        },
        {
          provide: Logger,
          useValue: {
            error: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<RedisCustomerRepository>(RedisCustomerRepository);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    postgresRepo.reset();
  });

  describe('findById', () => {
    it('should return cached customer if available', async () => {
      const customerPrimitives = CustomerTestFactory.createMockCustomer();
      const customer = Customer.fromPrimitives(customerPrimitives as any);
      const cachedCustomer = CustomerCacheMapper.toCache(customer);

      mockCacheService.get.mockResolvedValue(cachedCustomer);

      const result = await repository.findById(customer.id);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.id).toBe(customer.id);
      }
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `${CUSTOMER_REDIS.CACHE_KEY}:${customer.id}`,
      );
      expect(postgresRepo.findById).not.toHaveBeenCalled();
    });

    it('should fetch from postgres and cache if not in redis', async () => {
      const customerPrimitives = CustomerTestFactory.createMockCustomer();
      const customer = Customer.fromPrimitives(customerPrimitives as any);

      mockCacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(Result.success(customer));

      const result = await repository.findById(customer.id);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.id).toBe(customer.id);
      }
      expect(postgresRepo.findById).toHaveBeenCalledWith(customer.id);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `${CUSTOMER_REDIS.CACHE_KEY}:${customer.id}`,
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should return error if not found in both', async () => {
      mockCacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(
        Result.failure(new RepositoryError('Customer not found')),
      );

      const result = await repository.findById('non-existent');

      expect(result.isFailure).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should return cached customers if IS_CACHED_FLAG is set', async () => {
      const customerPrimitives = CustomerTestFactory.createMockCustomer();
      const customer = Customer.fromPrimitives(customerPrimitives as any);
      const cachedCustomer = CustomerCacheMapper.toCache(customer);

      mockCacheService.get.mockResolvedValue('true'); // Flag is set
      mockCacheService.search.mockResolvedValue([cachedCustomer]);

      const result = await repository.findAll(1, 10);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.items.length).toBe(1);
        expect(result.value.items[0].id).toBe(customer.id);
      }
      expect(mockCacheService.get).toHaveBeenCalledWith(
        CUSTOMER_REDIS.IS_CACHED_FLAG,
      );
      expect(mockCacheService.search).toHaveBeenCalledWith(
        CUSTOMER_REDIS.INDEX,
        '*',
        expect.any(Object),
      );
      expect(postgresRepo.findAll).not.toHaveBeenCalled();
    });

    it('should fall back to postgres if IS_CACHED_FLAG is not set, then cache results', async () => {
      const customerPrimitives = CustomerTestFactory.createMockCustomer();
      const customer = Customer.fromPrimitives(customerPrimitives as any);

      mockCacheService.get.mockResolvedValue(null); // Flag not set
      postgresRepo.findAll.mockResolvedValue(
        Result.success({ items: [customer], total: 1 }),
      );

      const result = await repository.findAll(1, 10);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.items.length).toBe(1);
        expect(result.value.items[0].id).toBe(customer.id);
      }
      expect(postgresRepo.findAll).toHaveBeenCalledWith(1, 10);

      // Verify caching happened
      expect(mockCacheService.setAll).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalledWith(
        CUSTOMER_REDIS.IS_CACHED_FLAG,
        'true',
        expect.any(Object),
      );
    });

    it('should not use cache if page is not 1 or limit is not 10', async () => {
      const customerPrimitives = CustomerTestFactory.createMockCustomer();
      const customer = Customer.fromPrimitives(customerPrimitives as any);

      postgresRepo.findAll.mockResolvedValue(
        Result.success({ items: [customer], total: 1 }),
      );

      const result = await repository.findAll(2, 10); // Page 2

      expect(result.isSuccess).toBe(true);
      expect(mockCacheService.get).not.toHaveBeenCalledWith(
        CUSTOMER_REDIS.IS_CACHED_FLAG,
      );
      expect(postgresRepo.findAll).toHaveBeenCalledWith(2, 10);
    });
  });
});
