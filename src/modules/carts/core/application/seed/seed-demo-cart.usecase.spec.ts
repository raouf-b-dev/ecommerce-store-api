import { SeedDemoCartUseCase } from './seed-demo-cart.usecase';
import { MockCartRepository } from '../../../testing/mocks/cart-repository.mock';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { Cart } from '../../domain/entities/cart';
import { DEMO_SEED_CART_ITEMS } from './demo-cart-items';

describe('SeedDemoCartUseCase', () => {
  let useCase: SeedDemoCartUseCase;
  let mockCartRepository: MockCartRepository;

  const dummyProducts = DEMO_SEED_CART_ITEMS.map((item, idx) => ({
    id: idx + 1,
    name: `Product ${item.sku}`,
    sku: item.sku,
    price: 50,
  }));

  beforeEach(() => {
    mockCartRepository = new MockCartRepository();
    useCase = new SeedDemoCartUseCase(mockCartRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should skip seeding if cart already exists and has items', async () => {
    const existingCart = Cart.createUserCart(1);
    existingCart.setId(10);
    existingCart.addItem(1, 'Headphones', 199.99, 1);

    mockCartRepository.findByuserId.mockResolvedValue(
      Result.success(existingCart),
    );

    const result = await useCase.execute({
      userId: 1,
      products: dummyProducts,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.status).toBe('existing');
    expect(result.value.cartId).toBe(10);
    expect(mockCartRepository.save).not.toHaveBeenCalled();
  });

  it('should seed cart items when cart does not exist', async () => {
    mockCartRepository.mockCartNotFound('1');
    mockCartRepository.save.mockImplementation((cart) => {
      cart.setId(99);
      return Promise.resolve(Result.success(cart));
    });

    const result = await useCase.execute({
      userId: 1,
      products: dummyProducts,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.status).toBe('created');
    expect(result.value.cartId).toBe(99);
    expect(result.value.itemCount).toBe(4); // 1 + 2 + 1 = 4
    expect(mockCartRepository.save).toHaveBeenCalled();
  });
});
