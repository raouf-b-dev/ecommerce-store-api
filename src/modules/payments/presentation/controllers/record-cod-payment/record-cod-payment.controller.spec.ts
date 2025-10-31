import { RecordCodPaymentController } from './record-cod-payment.controller';

describe('RecordCodPaymentController', () => {
  let controller: RecordCodPaymentController;

  beforeEach(async () => {
    controller = new RecordCodPaymentController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
