import { IPaymentGateway } from '../../domain/gateways/payment-gateway.interface';
import { PaymentMethodType } from '../../../../../shared-kernel/domain/value-objects/payment-method';

export abstract class PaymentGatewayResolver {
  abstract getGateway(method: PaymentMethodType): IPaymentGateway;
}
