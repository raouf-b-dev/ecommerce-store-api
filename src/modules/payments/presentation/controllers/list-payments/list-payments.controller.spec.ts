import { ListPaymentsController } from './list-payments.controller';

describe('ListPaymentsController', () => {
  let controller: ListPaymentsController;

  beforeEach(async () => {
    controller = new ListPaymentsController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
