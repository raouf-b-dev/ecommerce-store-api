import { Result } from '../../../../core/domain/result';
import { InfrastructureError } from '../../../../core/errors/infrastructure-error';
import { CheckStockResponse } from '../../../inventory/presentation/dto/check-stock-response.dto';

export interface InventoryGateway {
  checkStock(
    productId: number,
    quantity: number,
  ): Promise<Result<CheckStockResponse, InfrastructureError>>;
}
