import { PaymentListItemDTO } from '../../core/application/queries/results/payment-list-item.result';
import { PaymentDetailDTO } from '../../core/application/queries/results/payment-detail.result';
import { RawPaymentListQueryRow } from '../../secondary-adapters/dto/raw-payment-list-query-row.interface';
import { CreatePaymentDto } from '../../primary-adapters/dto/create-payment.dto';
import { ProcessRefundDto } from '../../primary-adapters/dto/process-refund.dto';
import { ListPaymentsQueryDto } from '../../primary-adapters/dto/list-payments-query.dto';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';
import {
  PaymentCompletedProps,
  PaymentFailedProps,
} from '../../core/domain/schedulers/payment-events.scheduler';
import { PaymentWebhookDto } from '../../core/application/services/handle-payment-webhook/handle-payment-webhook.service';
import { PaymentEventType } from '../../core/domain/value-objects/payment-event-type';
import { StripeWebhookPayload } from '../../core/application/ports/stripe-signature-verifier';
import { StripeWebhookCommand } from '../../core/application/usecases/handle-stripe-webhook/handle-stripe-webhook.usecase';
import { TEST_IDS } from '../../../../testing/helpers/test-data.helper';

export class PaymentDtoTestFactory {
  static createCreatePaymentDto(
    overrides?: Partial<CreatePaymentDto>,
  ): CreatePaymentDto {
    return {
      orderId: 100,
      amount: 99.99,
      paymentMethod: PaymentMethodType.STRIPE,
      currency: 'USD',
      ...overrides,
    };
  }

  static createProcessRefundDto(
    overrides?: Partial<ProcessRefundDto>,
  ): ProcessRefundDto {
    return {
      amount: 49.99,
      reason: 'Customer requested cancellation',
      ...overrides,
    };
  }

  static createListPaymentsQueryDto(
    overrides?: Partial<ListPaymentsQueryDto>,
  ): ListPaymentsQueryDto {
    return {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      ...overrides,
    };
  }

  static createRawPaymentListQueryRow(
    overrides?: Partial<RawPaymentListQueryRow>,
  ): RawPaymentListQueryRow {
    return {
      id: 1,
      orderId: 100,
      userId: 2,
      userName: 'John Doe',
      userEmail: 'john@example.com',
      amount: 99.99,
      currency: 'USD',
      status: 'COMPLETED',
      paymentMethod: 'CREDIT_CARD',
      transactionId: 'txn_123',
      gatewayPaymentIntentId: 'pi_123',
      failureReason: null,
      metadata: '{"provider":"stripe"}',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      ...overrides,
    };
  }

  static createPaymentListItemDTO(
    overrides?: Partial<PaymentListItemDTO>,
  ): PaymentListItemDTO {
    return {
      id: 1,
      orderId: 10,
      userId: 2,
      userName: 'John Doe',
      userEmail: 'john@example.com',
      amount: 99.99,
      currency: 'USD',
      status: 'COMPLETED',
      paymentMethod: 'CREDIT_CARD',
      transactionId: 'txn_123456',
      createdAt: '2024-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  static createPaymentDetailDTO(
    overrides?: Partial<PaymentDetailDTO>,
  ): PaymentDetailDTO {
    const base = this.createPaymentListItemDTO(overrides);
    return {
      ...base,
      gatewayPaymentIntentId: 'pi_123',
      failureReason: null,
      metadata: { provider: 'stripe' },
      updatedAt: base.createdAt,
      ...overrides,
    };
  }

  static createPaymentCompletedProps(
    overrides?: Partial<PaymentCompletedProps>,
  ): PaymentCompletedProps {
    return {
      orderId: TEST_IDS.order,
      paymentId: TEST_IDS.payment,
      transactionId: 'txn_test123',
      reservationId: 303,
      cartId: TEST_IDS.cart,
      ...overrides,
    };
  }

  static createPaymentFailedProps(
    overrides?: Partial<PaymentFailedProps>,
  ): PaymentFailedProps {
    return {
      orderId: TEST_IDS.order,
      paymentId: TEST_IDS.payment,
      reason: 'Insufficient funds',
      reservationId: 303,
      ...overrides,
    };
  }

  static createPaymentWebhookDto(
    overrides?: Partial<PaymentWebhookDto>,
  ): PaymentWebhookDto {
    return {
      paymentIntentId: 'pi_test123',
      eventType: PaymentEventType.SUCCEEDED,
      transactionId: 'txn_test123',
      ...overrides,
    };
  }

  static createStripeWebhookPayload(
    overrides?: Partial<StripeWebhookPayload>,
  ): StripeWebhookPayload {
    return {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test123',
          amount: 5000,
          amount_received: 5000,
          currency: 'usd',
          metadata: { orderId: String(TEST_IDS.order) },
        },
      },
      ...overrides,
    };
  }

  static createStripeWebhookCommand(
    overrides?: Partial<StripeWebhookCommand>,
  ): StripeWebhookCommand {
    return {
      signature: 'valid_stripe_signature',
      rawBody: Buffer.from(JSON.stringify(this.createStripeWebhookPayload())),
      ...overrides,
    };
  }
}
