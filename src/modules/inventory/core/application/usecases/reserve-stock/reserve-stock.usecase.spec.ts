import {
  InventoryCommandTestFactory,
  MockReservationRepository,
  ReservationRepositoryMockFactory,
  ReservationTestFactory,
} from 'src/modules/inventory/testing';
import { Test, TestingModule } from '@nestjs/testing';
import { ReserveStockUseCase } from './reserve-stock.usecase';
import { ReservationRepository } from '../../../domain/repositories/reservation.repository';
import { ResultAssertionHelper } from 'src/testing';

describe('ReserveStockUseCase', () => {
  let useCase: ReserveStockUseCase;
  let reservationRepository: MockReservationRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReserveStockUseCase,
        {
          provide: ReservationRepository,
          useFactory: () => ReservationRepositoryMockFactory.createMock(),
        },
      ],
    }).compile();

    useCase = module.get<ReserveStockUseCase>(ReserveStockUseCase);
    reservationRepository = module.get<
      ReservationRepository,
      MockReservationRepository
    >(ReservationRepository);
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

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(reservation);
      expect(reservationRepository.save).toHaveBeenCalledWith(dto);
    });

    it('should return failure if repository save fails', async () => {
      const dto = InventoryCommandTestFactory.createReservationInput();
      const errorMessage = 'Database error';
      reservationRepository.mockSaveFailure(errorMessage);

      const result = await useCase.execute(dto);

      ResultAssertionHelper.assertResultFailure(result, errorMessage);
      expect(reservationRepository.save).toHaveBeenCalledWith(dto);
    });
  });
});
