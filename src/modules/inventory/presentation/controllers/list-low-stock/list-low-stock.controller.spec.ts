import { AddAddressController } from '../../../../customers/presentation/controllers/add-address/add-address.controller';

describe('AddAddressController', () => {
  let controller: AddAddressController;

  beforeEach(async () => {
    controller = new AddAddressController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
