import { CorrelationService } from '../../infrastructure/logging/correlation/correlation.service';

export class MockCorrelationService extends CorrelationService {
  constructor() {
    super();
    this.generate = jest.fn().mockReturnValue('generated-uuid');
    this.run = jest.fn().mockImplementation((_id, fn) => fn());
    this.getId = jest.fn();
  }

  override generate: jest.Mock;
  override run: jest.Mock;
  override getId: jest.Mock;
}
