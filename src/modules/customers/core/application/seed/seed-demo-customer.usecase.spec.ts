import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { SeedDemoCustomerUseCase } from './seed-demo-customer.usecase';
import { CustomerRepository } from '../../domain/repositories/customer.repository';
import { CreateCustomerUseCase } from '../usecases/create-customer/create-customer.usecase';
import { MockCustomerRepository } from '../../../testing/mocks/customer-repository.mock';
import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Customer } from '../../domain/entities/customer';
import { CustomerTestFactory } from '../../../testing/factories/customer.factory';

describe('SeedDemoCustomerUseCase', () => {
  let useCase: SeedDemoCustomerUseCase;
  let customerRepository: MockCustomerRepository;
  let createCustomerUseCase: jest.Mocked<CreateCustomerUseCase>;

  beforeEach(async () => {
    const mockCreateUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedDemoCustomerUseCase,
        {
          provide: CustomerRepository,
          useClass: MockCustomerRepository,
        },
        {
          provide: CreateCustomerUseCase,
          useValue: mockCreateUseCase,
        },
      ],
    }).compile();

    useCase = module.get<SeedDemoCustomerUseCase>(SeedDemoCustomerUseCase);
    customerRepository = module.get<CustomerRepository>(
      CustomerRepository,
    ) as unknown as MockCustomerRepository;
    createCustomerUseCase = module.get<CreateCustomerUseCase>(
      CreateCustomerUseCase,
    ) as unknown as jest.Mocked<CreateCustomerUseCase>;
  });

  it('should skip seeding if customer already exists', async () => {
    const mockCustomer = Customer.fromPrimitives({
      ...CustomerTestFactory.createMockCustomer(),
      id: 42,
      email: 'customer@store.local',
    });
    customerRepository.findByEmail.mockResolvedValue(
      Result.success(mockCustomer),
    );

    const result = await useCase.execute();

    expect(result.isSuccess).toBe(true);
    expect((result as any).value).toEqual({
      id: 42,
      email: 'customer@store.local',
      status: 'existing',
    });
    expect(customerRepository.findByEmail).toHaveBeenCalledWith(
      'customer@store.local',
    );
    expect(createCustomerUseCase.execute).not.toHaveBeenCalled();
  });

  it('should seed customer profile when not existing', async () => {
    customerRepository.findByEmail.mockResolvedValue(
      Result.failure(
        new RepositoryError(
          'Customer not found',
          undefined,
          HttpStatus.NOT_FOUND,
        ),
      ),
    );
    createCustomerUseCase.execute.mockResolvedValue(
      Result.success({ id: 100 } as any),
    );

    const result = await useCase.execute();

    expect(result.isSuccess).toBe(true);
    expect((result as any).value).toEqual({
      id: 100,
      email: 'customer@store.local',
      status: 'created',
    });
    expect(customerRepository.findByEmail).toHaveBeenCalledWith(
      'customer@store.local',
    );
    expect(createCustomerUseCase.execute).toHaveBeenCalled();
  });

  it('should fail if findByEmail returns unexpected database error', async () => {
    customerRepository.findByEmail.mockResolvedValue(
      Result.failure(new RepositoryError('Unexpected DB error')),
    );

    const result = await useCase.execute();

    expect(result.isFailure).toBe(true);
    expect((result as any).error?.message).toContain(
      'Failed to check existing demo customer',
    );
    expect(createCustomerUseCase.execute).not.toHaveBeenCalled();
  });

  it('should propagate failure if customer creation fails', async () => {
    customerRepository.findByEmail.mockResolvedValue(
      Result.failure(
        new RepositoryError(
          'Customer not found',
          undefined,
          HttpStatus.NOT_FOUND,
        ),
      ),
    );
    createCustomerUseCase.execute.mockResolvedValue(
      Result.failure(new RepositoryError('Creation failed')),
    );

    const result = await useCase.execute();

    expect(result.isFailure).toBe(true);
    expect((result as any).error?.message).toContain(
      'Failed to seed demo customer',
    );
  });
});
