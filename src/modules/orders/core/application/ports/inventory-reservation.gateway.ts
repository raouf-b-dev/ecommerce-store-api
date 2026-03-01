import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';

export interface ReservationData {
  id: number | null;
}

export interface InventoryReservationGateway {
  getOrderReservations(
    orderId: number,
  ): Promise<Result<ReservationData[], InfrastructureError>>;
}
