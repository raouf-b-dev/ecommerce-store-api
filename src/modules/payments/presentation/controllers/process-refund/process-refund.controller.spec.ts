import { ProcessRefundController } from './process-refund.controller';

describe('ProcessRefundController', () => {
  let controller: ProcessRefundController;

  beforeEach(async () => {
    controller = new ProcessRefundController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
