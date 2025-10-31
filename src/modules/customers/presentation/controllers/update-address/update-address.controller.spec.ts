import { UpdateAddressController } from './update-address.controller';

describe('UpdateAddressController', () => {
  let controller: UpdateAddressController;

  beforeEach(async () => {
    controller = new UpdateAddressController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
