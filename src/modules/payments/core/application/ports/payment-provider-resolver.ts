import { PaymentMethodType } from '../../../../../shared-kernel/domain/value-objects/payment-method';
import { PaymentProvider } from './payment-provider';

export abstract class PaymentProviderResolver {
  abstract getProvider(method: PaymentMethodType): PaymentProvider;
}
