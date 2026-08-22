import {
  InventoryCommandTestFactory,
  MockReservationRepository,
  ReservationRepositoryMockFactory,
  ReservationTestFactory,
} from 'src/modules/inventory/testing';
import { Test, TestingModule } from '@nestjs/testing';
import { ReserveStockUseCase } from './reserve-stock.usecase';
import { POSTGRES_RESERVATION_REPOSITORY } from '../../../../inventory.token';

describe('ReserveStockUseCase', () => {
  let useCase: ReserveStockUseCase;
  let reservationRepository: MockReservationRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReserveStockUseCase,
        {
          provide: POSTGRES_RESERVATION_REPOSITORY,
          useFactory: () => ReservationRepositoryMockFactory.createMock(),
        },
      ],
    }).compile();

    useCase = module.get<ReserveStockUseCase>(ReserveStockUseCase);
    reservationRepository = module.get(POSTGRES_RESERVATION_REPOSITORY);
  });

  afterEach(() => {
    reservationRepository.reset();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should reserve stock successfully', async () => {
      const dto = InventoryCommandTestFactory.createReservationInput();
      const reservation = ReservationTestFactory.createPendingReservation({
        orderId: dto.orderId,
      });

      reservationRepository.mockSuccessfulSave(reservation);

      const result = await useCase.execute(dto);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value).toEqual(reservation);
      }
      expect(reservationRepository.save).toHaveBeenCalledWith(dto);
    });

    it('should return failure if repository save fails', async () => {
      const dto = InventoryCommandTestFactory.createReservationInput();
      const errorMessage = 'Database error';
      reservationRepository.mockSaveFailure(errorMessage);

      const result = await useCase.execute(dto);

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error.message).toBe(errorMessage);
      }
      expect(reservationRepository.save).toHaveBeenCalledWith(dto);
    });
  });
});
