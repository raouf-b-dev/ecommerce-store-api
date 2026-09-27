import { PaymentTestFactory } from 'src/modules/payments/testing';
import { CachedPaymentRepository } from './cached.payment-repository';
import { PostgresPaymentRepository } from '../postgres-payment-repository/postgres.payment-repository';
import { PaymentEntity } from '../../orm/payment.schema';
import { RefundEntity } from '../../orm/refund.schema';
import {
  PaymentCacheMapper,
  PaymentForCache,
} from '../../persistence/mappers/payment.mapper';
import { IntegrationTestHelper } from 'test/integration/harness/integration-test.helper';
import { SeededData } from 'test/integration/harness/seed-reference-data';
import { MockCacheService, MockLogger } from 'src/testing';
import { PAYMENT_REDIS } from 'src/infrastructure/redis/constants/redis.constants';
import { ResultAssertionHelper } from 'src/testing';

describe('CachedPaymentRepository (Integration - Real DB delegate)', () => {
  let repository: CachedPaymentRepository;
  let postgresRepo: PostgresPaymentRepository;
  let cacheService: MockCacheService;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const dataSource = IntegrationTestHelper.getDataSource();
    postgresRepo = new PostgresPaymentRepository(
      dataSource.getRepository(PaymentEntity),
      dataSource.getRepository(RefundEntity),
      dataSource,
    );
    cacheService = new MockCacheService();
    repository = new CachedPaymentRepository(
      cacheService,
      postgresRepo,
      new MockLogger(),
    );
  });

  const persistPayment = async () => {
    const payment = PaymentTestFactory.createDomainPayment({
      id: null,
      orderId: 9300,
      userId: seededData.customerUser.id,
      transactionId: 'tx-cached-9300',
    });
    const result = await postgresRepo.save(payment);
    ResultAssertionHelper.assertResultSuccess(result);
    return result.value;
  };

  it('loads from postgres on cache miss and populates the cache key', async () => {
    const saved = await persistPayment();
    cacheService.get.mockResolvedValue(null);

    const result = await repository.findById(saved.id!);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.orderId).toBe(9300);
    expect(cacheService.set).toHaveBeenCalledWith(
      `${PAYMENT_REDIS.CACHE_KEY}:${saved.id}`,
      expect.any(Object),
      { ttl: PAYMENT_REDIS.EXPIRATION },
    );
  });

  it('returns the cached payment on cache hit without a fresh postgres read', async () => {
    const saved = await persistPayment();
    const cached: PaymentForCache = {
      ...PaymentCacheMapper.toCache(saved),
      transactionId: 'from-cache-not-db',
    };
    cacheService.get.mockResolvedValue(cached);

    const result = await repository.findById(saved.id!);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.transactionId).toBe('from-cache-not-db');
    expect(cacheService.set).not.toHaveBeenCalled();
  });
});
