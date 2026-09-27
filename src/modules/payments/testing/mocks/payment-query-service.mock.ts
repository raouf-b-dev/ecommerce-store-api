import { PaymentQueryService } from '../../core/application/ports/payment-query.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { PaymentListItemDTO } from '../../core/application/queries/results/payment-list-item.result';
import { PaymentDetailDTO } from '../../core/application/queries/results/payment-detail.result';

export class MockPaymentQueryService implements PaymentQueryService {
  list = jest.fn();
  getById = jest.fn();
  getByOrderId = jest.fn();

  mockSuccessfulList(items: PaymentListItemDTO[], total?: number): void {
    const listTotal = total ?? items.length;
    this.list.mockResolvedValue(
      Result.success({
        items,
        total: listTotal,
        page: 1,
        limit: 10,
        totalPages: Math.ceil(listTotal / 10) || 1,
      }),
    );
  }

  mockSuccessfulGetById(detail: PaymentDetailDTO | null): void {
    this.getById.mockResolvedValue(Result.success(detail));
  }

  mockSuccessfulGetByOrderId(detail: PaymentDetailDTO | null): void {
    this.getByOrderId.mockResolvedValue(Result.success(detail));
  }

  reset(): void {
    this.list.mockReset();
    this.getById.mockReset();
    this.getByOrderId.mockReset();
  }
}
