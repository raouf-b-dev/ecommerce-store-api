import { CreateCustomerController } from './create-customer.controller';

describe('CreateCustomerController', () => {
  let controller: CreateCustomerController;

  beforeEach(async () => {
    controller = new CreateCustomerController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
