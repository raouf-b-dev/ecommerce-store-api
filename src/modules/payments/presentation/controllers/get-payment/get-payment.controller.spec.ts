import { GetPaymentController } from './get-payment.controller';

describe('GetPaymentController', () => {
  let controller: GetPaymentController;

  beforeEach(async () => {
    controller = new GetPaymentController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
