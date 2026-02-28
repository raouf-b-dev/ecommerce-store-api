import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { CheckStockResponse } from '../../../../inventory/primary-adapters/dto/check-stock-response.dto';

export interface InventoryGateway {
  checkStock(
    productId: number,
    quantity: number,
  ): Promise<Result<CheckStockResponse, InfrastructureError>>;
}
