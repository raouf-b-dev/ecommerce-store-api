import { SetDefaultAddressController } from './set-default-address.controller';

describe('SetDefaultAddressController', () => {
  let controller: SetDefaultAddressController;

  beforeEach(async () => {
    controller = new SetDefaultAddressController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
