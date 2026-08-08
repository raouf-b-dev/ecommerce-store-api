import { ReconcileInventoryUseCase } from './reconcile-inventory.usecase';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';
import { ReservationRepository } from '../../domain/repositories/reservation.repository';
import { Result } from '../../../../../shared-kernel/domain/result';
import { InventoryTestFactory } from '../../../testing/factories/inventory.test.factory';
import { Inventory } from '../../domain/entities/inventory';

describe('ReconcileInventoryUseCase', () => {
  let useCase: ReconcileInventoryUseCase;
  let mockInventoryRepo: jest.Mocked<InventoryRepository>;
  let mockReservationRepo: jest.Mocked<ReservationRepository>;

  beforeEach(() => {
    mockInventoryRepo = {
      findBatch: jest.fn(),
    } as unknown as jest.Mocked<InventoryRepository>;

    mockReservationRepo = {
      sumPendingReservedByProductIds: jest.fn(),
    } as unknown as jest.Mocked<ReservationRepository>;

    useCase = new ReconcileInventoryUseCase(
      mockInventoryRepo,
      mockReservationRepo,
    );
  });

  it('should report zero discrepancies when all inventory reservations match active PENDING sum', async () => {
    const inv = Inventory.fromPrimitives(
      InventoryTestFactory.createMockInventory({
        id: 1,
        productId: 101,
        availableQuantity: 50,
        reservedQuantity: 10,
      }),
    );

    mockInventoryRepo.findBatch
      .mockResolvedValueOnce(Result.success([inv]))
      .mockResolvedValueOnce(Result.success([]));

    const pendingMap = new Map<number, number>();
    pendingMap.set(101, 10);
    mockReservationRepo.sumPendingReservedByProductIds.mockResolvedValue(
      Result.success(pendingMap),
    );

    const result = await useCase.execute();

    if (!result.isSuccess) throw new Error('Expected success');
    expect(result.value.totalChecked).toBe(1);
    expect(result.value.discrepancies).toHaveLength(0);
  });

  it('should detect reservation drift when reservedQuantity != pending reservations sum', async () => {
    const inv = Inventory.fromPrimitives(
      InventoryTestFactory.createMockInventory({
        id: 1,
        productId: 101,
        availableQuantity: 50,
        reservedQuantity: 10,
      }),
    );

    mockInventoryRepo.findBatch
      .mockResolvedValueOnce(Result.success([inv]))
      .mockResolvedValueOnce(Result.success([]));

    const pendingMap = new Map<number, number>();
    pendingMap.set(101, 5); // Discrepancy! Reserved is 10, but active pending sum is 5

    mockReservationRepo.sumPendingReservedByProductIds.mockResolvedValue(
      Result.success(pendingMap),
    );

    const result = await useCase.execute();

    if (!result.isSuccess) throw new Error('Expected success');
    expect(result.value.discrepancies).toHaveLength(1);
    expect(result.value.discrepancies[0]).toEqual({
      productId: 101,
      type: 'reservation_drift',
      expected: 5,
      actual: 10,
    });
  });
});
