import { VerifyPaymentController } from './verify-payment.controller';

describe('VerifyPaymentController', () => {
  let controller: VerifyPaymentController;

  beforeEach(async () => {
    controller = new VerifyPaymentController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
