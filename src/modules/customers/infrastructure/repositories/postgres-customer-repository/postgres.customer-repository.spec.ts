import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresCustomerRepository } from './postgres.customer-repository';
import { CustomerEntity } from '../../orm/customer.schema';
import { CustomerTestFactory } from '../../../testing/factories/customer.factory';
import { CustomerMapper } from '../../persistence/mappers/customer.mapper';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { Customer } from '../../../domain/entities/customer';

describe('PostgresCustomerRepository', () => {
  let repository: PostgresCustomerRepository;
  let typeOrmRepository: Repository<CustomerEntity>;

  const mockTypeOrmRepository = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostgresCustomerRepository,
        {
          provide: getRepositoryToken(CustomerEntity),
          useValue: mockTypeOrmRepository,
        },
      ],
    }).compile();

    repository = module.get<PostgresCustomerRepository>(
      PostgresCustomerRepository,
    );
    typeOrmRepository = module.get<Repository<CustomerEntity>>(
      getRepositoryToken(CustomerEntity),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a customer when found', async () => {
      const customerPrimitives = CustomerTestFactory.createMockCustomer();
      const customer = Customer.fromPrimitives(customerPrimitives as any);
      const entity = CustomerMapper.toEntity(customer);
      mockTypeOrmRepository.findOne.mockResolvedValue(entity);

      const result = await repository.findById(customer.id);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.id).toBe(customer.id);
      }
    });

    it('should return error when customer not found', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error).toBeInstanceOf(RepositoryError);
      }
    });
  });

  describe('save', () => {
    it('should save and return a customer', async () => {
      const customerPrimitives = CustomerTestFactory.createMockCustomer();
      const customer = Customer.fromPrimitives(customerPrimitives as any);
      const entity = CustomerMapper.toEntity(customer);
      mockTypeOrmRepository.save.mockResolvedValue(entity);

      const result = await repository.save(customer);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.id).toBe(customer.id);
      }
    });
  });
});
