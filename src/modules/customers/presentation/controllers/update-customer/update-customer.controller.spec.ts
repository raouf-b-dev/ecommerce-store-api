import { UpdateCustomerController } from './update-customer.controller';

describe('UpdateCustomerController', () => {
  let controller: UpdateCustomerController;

  beforeEach(async () => {
    controller = new UpdateCustomerController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
