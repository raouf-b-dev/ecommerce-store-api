import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, EntityManager } from 'typeorm';
import { PostgresReservationRepository } from './postgres.reservation-repository';
import { ReservationEntity } from '../../orm/reservation.schema';
import { InventoryEntity } from '../../orm/inventory.schema';
import { IdGeneratorService } from '../../../../../core/infrastructure/orm/id-generator.service';
import { InventoryDtoTestFactory } from '../../../testing/factories/inventory-dto.test.factory';
import { ReservationTestFactory } from '../../../testing/factories/reservation.test.factory';
import { ReservationMapper } from '../../persistence/mappers/reservation.mapper';

describe('PostgresReservationRepository', () => {
  let repository: PostgresReservationRepository;
  let typeOrmRepository: jest.Mocked<Repository<ReservationEntity>>;
  let dataSource: jest.Mocked<DataSource>;
  let idGeneratorService: jest.Mocked<IdGeneratorService>;
  let entityManager: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    const mockTypeOrmRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };

    entityManager = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    const mockDataSource = {
      transaction: jest.fn().mockImplementation((cb) => cb(entityManager)),
    };

    const mockIdGeneratorService = {
      generateReservationId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostgresReservationRepository,
        {
          provide: getRepositoryToken(ReservationEntity),
          useValue: mockTypeOrmRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: IdGeneratorService,
          useValue: mockIdGeneratorService,
        },
      ],
    }).compile();

    repository = module.get<PostgresReservationRepository>(
      PostgresReservationRepository,
    );
    typeOrmRepository = module.get(getRepositoryToken(ReservationEntity));
    dataSource = module.get(DataSource);
    idGeneratorService = module.get(IdGeneratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('should save reservation and update inventory successfully', async () => {
      const dto = InventoryDtoTestFactory.createReserveStockDto();
      const reservationId = 'RES_NEW';
      idGeneratorService.generateReservationId.mockResolvedValue(reservationId);

      const inventoryEntity = {
        productId: dto.items[0].productId,
        availableQuantity: 10,
        reservedQuantity: 0,
      } as InventoryEntity;

      entityManager.find.mockResolvedValue([inventoryEntity]);
      entityManager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await repository.save(dto);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.id).toBe(reservationId);
      }
      expect(entityManager.find).toHaveBeenCalledWith(
        InventoryEntity,
        expect.anything(),
      );
      expect(entityManager.save).toHaveBeenCalledTimes(2);
      expect(inventoryEntity.availableQuantity).toBe(
        10 - dto.items[0].quantity,
      );
      expect(inventoryEntity.reservedQuantity).toBe(dto.items[0].quantity);
    });

    it('should fail if inventory not found', async () => {
      const dto = InventoryDtoTestFactory.createReserveStockDto();
      idGeneratorService.generateReservationId.mockResolvedValue('RES_NEW');

      entityManager.find.mockResolvedValue([]);

      const result = await repository.save(dto);

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error.message).toContain('Inventory not found');
      }
    });

    it('should fail if insufficient stock', async () => {
      const dto = InventoryDtoTestFactory.createReserveStockDto();
      idGeneratorService.generateReservationId.mockResolvedValue('RES_NEW');

      const inventoryEntity = {
        productId: dto.items[0].productId,
        availableQuantity: 0, // Insufficient
        reservedQuantity: 0,
      } as InventoryEntity;

      entityManager.find.mockResolvedValue([inventoryEntity]);

      const result = await repository.save(dto);

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error.message).toContain('Insufficient stock');
      }
    });
  });

  describe('findById', () => {
    it('should return reservation if found', async () => {
      const reservation = ReservationTestFactory.createPendingReservation();
      const entity = ReservationMapper.toEntity(reservation);
      typeOrmRepository.findOne.mockResolvedValue(entity);

      const result = await repository.findById(reservation.id);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.id).toBe(reservation.id);
      }
    });

    it('should return failure if not found', async () => {
      typeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.findById('RES_NOT_FOUND');

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error.message).toBe('Reservation not found');
      }
    });
  });

  describe('release', () => {
    it('should release reservation and restore inventory', async () => {
      const reservation = ReservationTestFactory.createPendingReservation();
      const reservationEntity = ReservationMapper.toEntity(reservation);

      const inventoryEntity = {
        productId: reservation.items[0].productId,
        availableQuantity: 8,
        reservedQuantity: 2,
      } as InventoryEntity;

      entityManager.findOne.mockResolvedValue(reservationEntity);
      entityManager.find.mockResolvedValue([inventoryEntity]);
      entityManager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await repository.release(reservation);

      expect(result.isSuccess).toBe(true);
      expect(entityManager.findOne).toHaveBeenCalledWith(
        ReservationEntity,
        expect.anything(),
      );
      expect(entityManager.find).toHaveBeenCalledWith(
        InventoryEntity,
        expect.anything(),
      );
      expect(inventoryEntity.availableQuantity).toBe(
        8 + reservation.items[0].quantity,
      );
      expect(inventoryEntity.reservedQuantity).toBe(
        2 - reservation.items[0].quantity,
      );
    });

    it('should return success if already released', async () => {
      const reservation = ReservationTestFactory.createReleasedReservation();
      const reservationEntity = ReservationMapper.toEntity(reservation);

      entityManager.findOne.mockResolvedValue(reservationEntity);

      const result = await repository.release(reservation);

      expect(result.isSuccess).toBe(true);
      expect(entityManager.save).not.toHaveBeenCalled();
    });
  });

  describe('confirm', () => {
    it('should confirm reservation', async () => {
      const reservation = ReservationTestFactory.createPendingReservation();
      const reservationEntity = ReservationMapper.toEntity(reservation);

      entityManager.findOne.mockResolvedValue(reservationEntity);

      const inventoryEntity = {
        productId: reservation.items[0].productId,
        availableQuantity: 10,
        reservedQuantity: 5,
      } as InventoryEntity;
      entityManager.find.mockResolvedValue([inventoryEntity]);

      entityManager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await repository.confirm(reservation);

      expect(result.isSuccess).toBe(true);
      expect(entityManager.save).toHaveBeenCalled();
    });

    it('should return success if already confirmed', async () => {
      const reservation = ReservationTestFactory.createConfirmedReservation();
      const reservationEntity = ReservationMapper.toEntity(reservation);

      entityManager.findOne.mockResolvedValue(reservationEntity);

      const result = await repository.confirm(reservation);

      expect(result.isSuccess).toBe(true);
      expect(entityManager.save).not.toHaveBeenCalled();
    });
  });
});
