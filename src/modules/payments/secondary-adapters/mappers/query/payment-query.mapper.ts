import { PaymentListItemDTO } from '../../../core/application/queries/results/payment-list-item.result';
import { PaymentDetailDTO } from '../../../core/application/queries/results/payment-detail.result';
import { RawPaymentListQueryRow } from '../../dto/raw-payment-list-query-row.interface';

export class PaymentQueryMapper {
  static toListItemDto(row: RawPaymentListQueryRow): PaymentListItemDTO {
    return {
      id: Number(row.id),
      orderId: Number(row.orderId),
      userId: Number(row.userId || 0),
      userName: row.userName || 'Unknown User',
      userEmail: row.userEmail || '',
      amount: Number(row.amount || 0),
      currency: row.currency || 'USD',
      status: String(row.status),
      paymentMethod: row.paymentMethod || 'CREDIT_CARD',
      transactionId: row.transactionId || '',
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt),
    };
  }

  static toDetailDto(row: RawPaymentListQueryRow): PaymentDetailDTO {
    const base = this.toListItemDto(row);
    let parsedMetadata: Record<string, any> | null = null;

    if (row.metadata) {
      if (typeof row.metadata === 'string') {
        try {
          parsedMetadata = JSON.parse(row.metadata);
        } catch {
          parsedMetadata = null;
        }
      } else {
        parsedMetadata = row.metadata;
      }
    }

    return {
      ...base,
      gatewayPaymentIntentId: row.gatewayPaymentIntentId
        ? String(row.gatewayPaymentIntentId)
        : null,
      failureReason: row.failureReason || null,
      metadata: parsedMetadata,
      updatedAt: row.updatedAt
        ? row.updatedAt instanceof Date
          ? row.updatedAt.toISOString()
          : String(row.updatedAt)
        : base.createdAt,
    };
  }
}
