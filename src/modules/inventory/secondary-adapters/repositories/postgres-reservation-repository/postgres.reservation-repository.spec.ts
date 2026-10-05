import {
  InventoryCommandTestFactory,
  ReservationTestFactory,
} from 'src/modules/inventory/testing';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, EntityManager } from 'typeorm';
import { PostgresReservationRepository } from './postgres.reservation-repository';
import { ReservationEntity } from '../../orm/reservation.schema';
import { InventoryEntity } from '../../orm/inventory.schema';
import { ReservationMapper } from '../../persistence/mappers/reservation.mapper';
import { ReservationStatus } from '../../../core/domain/value-objects/reservation-status';
import { ResultAssertionHelper } from 'src/testing';
import { RepositoryError } from 'src/shared-kernel/domain/exceptions/repository.error';

describe('PostgresReservationRepository', () => {
  let repository: PostgresReservationRepository;
  let typeOrmRepository: jest.Mocked<Repository<ReservationEntity>>;
  let dataSource: jest.Mocked<DataSource>;
  let entityManager: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostgresReservationRepository,
        {
          provide: getRepositoryToken(ReservationEntity),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: EntityManager,
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<PostgresReservationRepository>(
      PostgresReservationRepository,
    );
    typeOrmRepository = module.get(getRepositoryToken(ReservationEntity));
    dataSource = module.get(DataSource);
    entityManager = module.get(EntityManager);

    dataSource.transaction.mockImplementation((...args: unknown[]) => {
      const callback = args.find(
        (arg): arg is (mgr: EntityManager) => Promise<unknown> =>
          typeof arg === 'function',
      );
      if (callback) {
        return callback(entityManager);
      }
      return Promise.resolve();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('should save reservation and update inventory successfully', async () => {
      const dto = InventoryCommandTestFactory.createReservationInput();
      const reservationId = 1;

      const inventoryEntity = Object.assign(new InventoryEntity(), {
        productId: dto.items[0].productId,
        availableQuantity: 10,
        reservedQuantity: 0,
      });

      entityManager.find.mockResolvedValue([inventoryEntity]);
      entityManager.save.mockImplementation((entity) => {
        if (entity instanceof ReservationEntity) {
          return Promise.resolve(Object.assign({}, entity, { id: 1 }));
        }
        return Promise.resolve(entity);
      });

      const result = await repository.save(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(reservationId);
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
      const dto = InventoryCommandTestFactory.createReservationInput();

      entityManager.find.mockResolvedValue([]);

      const result = await repository.save(dto);

      ResultAssertionHelper.assertResultFailure(result, 'Inventory not found');
    });

    it('should fail if insufficient stock', async () => {
      const dto = InventoryCommandTestFactory.createReservationInput();

      const inventoryEntity = {
        productId: dto.items[0].productId,
        availableQuantity: 0, // Insufficient
        reservedQuantity: 0,
      } as InventoryEntity;

      entityManager.find.mockResolvedValue([inventoryEntity]);

      const result = await repository.save(dto);

      ResultAssertionHelper.assertResultFailure(result, 'Insufficient stock');
    });
  });

  describe('findById', () => {
    it('should return reservation if found', async () => {
      const reservationId = 1;
      const reservation = ReservationTestFactory.createPendingReservation({
        id: reservationId,
      });
      const entity = ReservationMapper.toEntity(reservation);
      typeOrmRepository.findOne.mockResolvedValue(entity);

      const result = await repository.findById(reservationId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(reservationId);
    });

    it('should return failure if not found', async () => {
      typeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.findById(404);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Reservation not found',
        RepositoryError,
      );
    });
  });

  describe('release', () => {
    it('should release reservation and restore inventory', async () => {
      const reservation = ReservationTestFactory.createPendingReservation();
      const reservationEntity = ReservationMapper.toEntity(reservation);

      const inventoryEntity = Object.assign(new InventoryEntity(), {
        productId: reservation.items[0].productId,
        availableQuantity: 8,
        reservedQuantity: 2,
      });

      entityManager.findOne.mockResolvedValue(reservationEntity);
      entityManager.find.mockResolvedValue([inventoryEntity]);
      entityManager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await repository.release(reservation);

      ResultAssertionHelper.assertResultSuccess(result);
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

    it('should release CONFIRMED reservation without decrementing reservedQuantity', async () => {
      const reservation = ReservationTestFactory.createConfirmedReservation();
      const reservationEntity = ReservationMapper.toEntity(reservation);

      const inventoryEntity = Object.assign(new InventoryEntity(), {
        productId: reservation.items[0].productId,
        availableQuantity: 8,
        reservedQuantity: 2,
      });

      entityManager.findOne.mockResolvedValue(reservationEntity);
      entityManager.find.mockResolvedValue([inventoryEntity]);
      entityManager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await repository.release(reservation);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(inventoryEntity.availableQuantity).toBe(
        8 + reservation.items[0].quantity,
      );
      expect(inventoryEntity.reservedQuantity).toBe(2);
    });

    it('should return success if already released', async () => {
      const reservation = ReservationTestFactory.createReleasedReservation();
      const reservationEntity = ReservationMapper.toEntity(reservation);

      entityManager.findOne.mockResolvedValue(reservationEntity);

      const result = await repository.release(reservation);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(entityManager.save).not.toHaveBeenCalled();
    });
  });

  describe('confirm', () => {
    it('should confirm reservation', async () => {
      const reservation = ReservationTestFactory.createPendingReservation();
      const reservationEntity = ReservationMapper.toEntity(reservation);

      entityManager.findOne.mockResolvedValue(reservationEntity);

      const inventoryEntity = Object.assign(new InventoryEntity(), {
        productId: reservation.items[0].productId,
        availableQuantity: 10,
        reservedQuantity: 5,
      });
      entityManager.find.mockResolvedValue([inventoryEntity]);

      entityManager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await repository.confirm(reservation);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(entityManager.save).toHaveBeenCalled();
    });

    it('should return success if already confirmed', async () => {
      const reservation = ReservationTestFactory.createConfirmedReservation();
      const reservationEntity = ReservationMapper.toEntity(reservation);

      entityManager.findOne.mockResolvedValue(reservationEntity);

      const result = await repository.confirm(reservation);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(entityManager.save).not.toHaveBeenCalled();
    });

    it('should fail if reservation status in DB is not PENDING', async () => {
      const reservation = ReservationTestFactory.createPendingReservation();
      const releasedEntity = Object.assign(
        ReservationMapper.toEntity(reservation),
        { status: ReservationStatus.RELEASED },
      );

      entityManager.findOne.mockResolvedValue(releasedEntity);

      const result = await repository.confirm(reservation);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Cannot confirm reservation in RELEASED status',
        RepositoryError,
      );
    });

    it('should fail if reservation in DB is expired', async () => {
      const reservation = ReservationTestFactory.createPendingReservation();
      const expiredEntity = Object.assign(
        ReservationMapper.toEntity(reservation),
        { expiresAt: new Date(Date.now() - 60000) },
      );

      entityManager.findOne.mockResolvedValue(expiredEntity);

      const result = await repository.confirm(reservation);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Cannot confirm expired reservation',
        RepositoryError,
      );
    });
  });

  describe('expire', () => {
    it('should expire PENDING reservation and return stock to available', async () => {
      const reservation = ReservationTestFactory.createPendingReservation();
      const reservationEntity = ReservationMapper.toEntity(reservation);

      const inventoryEntity = Object.assign(new InventoryEntity(), {
        productId: reservation.items[0].productId,
        availableQuantity: 10,
        reservedQuantity: 5,
      });

      entityManager.findOne.mockResolvedValue(reservationEntity);
      entityManager.find.mockResolvedValue([inventoryEntity]);
      entityManager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await repository.expire(reservation);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(inventoryEntity.availableQuantity).toBe(
        10 + reservation.items[0].quantity,
      );
      expect(inventoryEntity.reservedQuantity).toBe(
        5 - reservation.items[0].quantity,
      );
    });

    it('should return success if already expired', async () => {
      const reservation = ReservationTestFactory.createExpiredReservation();
      const reservationEntity = ReservationMapper.toEntity(reservation);

      entityManager.findOne.mockResolvedValue(reservationEntity);

      const result = await repository.expire(reservation);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(entityManager.save).not.toHaveBeenCalled();
    });

    it('should fail if reservation status in DB is not PENDING', async () => {
      const reservation = ReservationTestFactory.createPendingReservation();
      const confirmedEntity = Object.assign(
        ReservationMapper.toEntity(reservation),
        { status: ReservationStatus.CONFIRMED },
      );

      entityManager.findOne.mockResolvedValue(confirmedEntity);

      const result = await repository.expire(reservation);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Cannot expire reservation in CONFIRMED status',
        RepositoryError,
      );
    });
  });

  describe('findPendingExpired', () => {
    it('should query with status PENDING, LessThan date, optional limit, and optional excludeIds', async () => {
      const reservation = ReservationTestFactory.createPendingReservation();
      const entity = ReservationMapper.toEntity(reservation);
      typeOrmRepository.find.mockResolvedValue([entity]);

      const testDate = new Date();
      const result = await repository.findPendingExpired(testDate, 50, [1, 2]);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(typeOrmRepository.find).toHaveBeenCalledWith({
        where: {
          status: ReservationStatus.PENDING,
          expiresAt: expect.anything(),
          id: expect.anything(),
        },
        take: 50,
        order: { expiresAt: 'ASC', id: 'ASC' },
      });
    });
  });
});
