import { DeleteAddressController } from './delete-address.controller';

describe('DeleteAddressController', () => {
  let controller: DeleteAddressController;

  beforeEach(async () => {
    controller = new DeleteAddressController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
