import { CreatePaymentController } from './create-payment.controller';

describe('CreatePaymentController', () => {
  let controller: CreatePaymentController;

  beforeEach(async () => {
    controller = new CreatePaymentController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
