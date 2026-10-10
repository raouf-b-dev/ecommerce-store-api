import { PaymentProviderRegistry } from './payment-provider.registry';
import { FakeStripeGateway } from './fake-stripe.gateway';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';
import { MockEnvConfigService, createMockQueue } from '../../../../testing';
import { JobConfigService } from '../../../../infrastructure/jobs/job-config.service';

describe('PaymentProviderRegistry', () => {
  let registry: PaymentProviderRegistry;
  let fakeStripeGateway: FakeStripeGateway;

  beforeEach(() => {
    fakeStripeGateway = new FakeStripeGateway(
      createMockQueue('payments'),
      new MockEnvConfigService(),
      new JobConfigService(),
    );
    registry = new PaymentProviderRegistry(fakeStripeGateway);
  });

  it('returns FakeStripeGateway when payment method is STRIPE', () => {
    const provider = registry.getProvider(PaymentMethodType.STRIPE);

    expect(provider).toBe(fakeStripeGateway);
  });

  it('throws error when payment method is unsupported', () => {
    expect(() => {
      // @ts-expect-error testing unsupported payment method
      registry.getProvider('UNKNOWN_METHOD');
    }).toThrow('Unsupported payment method: UNKNOWN_METHOD');
  });
});
