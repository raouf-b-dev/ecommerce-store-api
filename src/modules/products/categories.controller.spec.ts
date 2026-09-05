import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { ListCategoriesUseCase } from './core/application/usecases/categories/list-categories.usecase';
import { GetCategoryUseCase } from './core/application/usecases/categories/get-category.usecase';
import { CreateCategoryUseCase } from './core/application/usecases/categories/create-category.usecase';
import { UpdateCategoryUseCase } from './core/application/usecases/categories/update-category.usecase';
import { DeleteCategoryUseCase } from './core/application/usecases/categories/delete-category.usecase';
import { ActivateCategoryUseCase } from './core/application/usecases/categories/activate-category.usecase';
import { DeactivateCategoryUseCase } from './core/application/usecases/categories/deactivate-category.usecase';
import { CreateCategoryDto } from './primary-adapters/dto/create-category.dto';
import { UpdateCategoryDto } from './primary-adapters/dto/update-category.dto';
import { Result } from '../../shared-kernel/domain/result';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let listCategoriesUseCase: ListCategoriesUseCase;
  let getCategoryUseCase: GetCategoryUseCase;
  let createCategoryUseCase: CreateCategoryUseCase;
  let updateCategoryUseCase: UpdateCategoryUseCase;
  let deleteCategoryUseCase: DeleteCategoryUseCase;
  let activateCategoryUseCase: ActivateCategoryUseCase;
  let deactivateCategoryUseCase: DeactivateCategoryUseCase;

  const category = {
    id: 1,
    name: 'Electronics',
    slug: 'electronics',
    description: null,
    isActive: true,
  };

  let createCategoryDto: CreateCategoryDto;
  let updateCategoryDto: UpdateCategoryDto;
  let id: number;

  beforeEach(async () => {
    id = 1;
    createCategoryDto = {
      name: 'Electronics',
      slug: 'electronics',
    };
    updateCategoryDto = {
      name: 'Electronics',
      description: 'Gadgets',
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: ListCategoriesUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success([category])),
          },
        },
        {
          provide: GetCategoryUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(category)),
          },
        },
        {
          provide: CreateCategoryUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(category)),
          },
        },
        {
          provide: UpdateCategoryUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(category)),
          },
        },
        {
          provide: DeleteCategoryUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: ActivateCategoryUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: DeactivateCategoryUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
      ],
    }).compile();

    controller = module.get(CategoriesController);
    listCategoriesUseCase = module.get(ListCategoriesUseCase);
    getCategoryUseCase = module.get(GetCategoryUseCase);
    createCategoryUseCase = module.get(CreateCategoryUseCase);
    updateCategoryUseCase = module.get(UpdateCategoryUseCase);
    deleteCategoryUseCase = module.get(DeleteCategoryUseCase);
    activateCategoryUseCase = module.get(ActivateCategoryUseCase);
    deactivateCategoryUseCase = module.get(DeactivateCategoryUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('calls ListCategoriesUseCase on findAll', async () => {
    const query = { isActive: true };
    await controller.findAll(query);
    expect(listCategoriesUseCase.execute).toHaveBeenCalledWith(query);
  });

  it('calls GetCategoryUseCase on findOne', async () => {
    await controller.findOne(id);
    expect(getCategoryUseCase.execute).toHaveBeenCalledWith(id);
  });

  it('calls CreateCategoryUseCase on create', async () => {
    await controller.create(createCategoryDto);
    expect(createCategoryUseCase.execute).toHaveBeenCalledWith(
      createCategoryDto,
    );
  });

  it('calls UpdateCategoryUseCase on update', async () => {
    await controller.update(id, updateCategoryDto);
    expect(updateCategoryUseCase.execute).toHaveBeenCalledWith({
      id,
      ...updateCategoryDto,
    });
  });

  it('calls DeleteCategoryUseCase on remove', async () => {
    await controller.remove(id);
    expect(deleteCategoryUseCase.execute).toHaveBeenCalledWith(id);
  });

  it('calls ActivateCategoryUseCase on activate', async () => {
    await controller.activate(id);
    expect(activateCategoryUseCase.execute).toHaveBeenCalledWith(id);
  });

  it('calls DeactivateCategoryUseCase on deactivate', async () => {
    await controller.deactivate(id);
    expect(deactivateCategoryUseCase.execute).toHaveBeenCalledWith(id);
  });
});
