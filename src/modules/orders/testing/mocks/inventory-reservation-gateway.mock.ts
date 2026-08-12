import { Result } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from 'src/shared-kernel/domain/exceptions/infrastructure-error';
import {
  InventoryReservationGateway,
  ReservationData,
  ReserveStockInput,
} from '../../core/application/ports/inventory-reservation.gateway';

export class MockInventoryReservationGateway implements InventoryReservationGateway {
  getOrderReservations = jest.fn<
    Promise<Result<ReservationData[], InfrastructureError>>,
    [number]
  >();

  reserveStock = jest.fn<
    Promise<Result<ReservationData, InfrastructureError>>,
    [ReserveStockInput]
  >();

  releaseStock = jest.fn<
    Promise<Result<void, InfrastructureError>>,
    [number]
  >();

  confirmReservation = jest.fn<
    Promise<Result<void, InfrastructureError>>,
    [number]
  >();

  mockSuccessfulGetOrderReservations(reservations: ReservationData[]): void {
    this.getOrderReservations.mockResolvedValue(Result.success(reservations));
  }

  mockGetOrderReservationsError(error: InfrastructureError): void {
    this.getOrderReservations.mockResolvedValue(Result.failure(error));
  }

  mockSuccessfulReserveStock(reservation: ReservationData): void {
    this.reserveStock.mockResolvedValue(Result.success(reservation));
  }

  mockReserveStockError(error: InfrastructureError): void {
    this.reserveStock.mockResolvedValue(Result.failure(error));
  }

  mockSuccessfulReleaseStock(): void {
    this.releaseStock.mockResolvedValue(Result.success(undefined));
  }

  mockReleaseStockError(error: InfrastructureError): void {
    this.releaseStock.mockResolvedValue(Result.failure(error));
  }

  mockSuccessfulConfirmReservation(): void {
    this.confirmReservation.mockResolvedValue(Result.success(undefined));
  }

  mockConfirmReservationError(error: InfrastructureError): void {
    this.confirmReservation.mockResolvedValue(Result.failure(error));
  }

  reset(): void {
    jest.clearAllMocks();
  }

  verifyNoUnexpectedCalls(): void {
    expect(this.getOrderReservations).not.toHaveBeenCalled();
    expect(this.reserveStock).not.toHaveBeenCalled();
    expect(this.releaseStock).not.toHaveBeenCalled();
    expect(this.confirmReservation).not.toHaveBeenCalled();
  }
}
