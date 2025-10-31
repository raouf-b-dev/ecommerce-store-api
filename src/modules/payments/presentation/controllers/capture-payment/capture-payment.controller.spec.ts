import { CapturePaymentController } from './capture-payment.controller';

describe('CapturePaymentController', () => {
  let controller: CapturePaymentController;

  beforeEach(async () => {
    controller = new CapturePaymentController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
