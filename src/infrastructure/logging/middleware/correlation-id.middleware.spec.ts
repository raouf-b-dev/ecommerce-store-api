import { CorrelationIdMiddleware } from './correlation-id.middleware';
import { CorrelationService } from '../correlation/correlation.service';
import { Request, Response } from 'express';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let correlationService: jest.Mocked<CorrelationService>;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    correlationService = {
      generate: jest.fn().mockReturnValue('generated-uuid'),
      run: jest.fn().mockImplementation((id, fn) => fn()),
      getId: jest.fn(),
    } as unknown as jest.Mocked<CorrelationService>;

    middleware = new CorrelationIdMiddleware(correlationService);

    req = {
      headers: {},
    };

    res = {
      setHeader: jest.fn(),
    };

    next = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should use existing X-Request-Id header if present', () => {
    req.headers!['x-request-id'] = 'existing-id';

    middleware.use(req as Request, res as Response, next);

    expect(correlationService.generate).not.toHaveBeenCalled();
    expect(req['correlationId']).toBe('existing-id');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'existing-id');
    expect(correlationService.run).toHaveBeenCalledWith(
      'existing-id',
      expect.any(Function),
    );
    expect(next).toHaveBeenCalled();
  });

  it('should use first element if X-Request-Id header is an array', () => {
    req.headers!['x-request-id'] = ['array-id-1', 'array-id-2'];

    middleware.use(req as Request, res as Response, next);

    expect(correlationService.generate).not.toHaveBeenCalled();
    expect(req['correlationId']).toBe('array-id-1');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'array-id-1');
    expect(correlationService.run).toHaveBeenCalledWith(
      'array-id-1',
      expect.any(Function),
    );
    expect(next).toHaveBeenCalled();
  });

  it('should generate new id if X-Request-Id header is missing', () => {
    middleware.use(req as Request, res as Response, next);

    expect(correlationService.generate).toHaveBeenCalled();
    expect(req['correlationId']).toBe('generated-uuid');
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Request-Id',
      'generated-uuid',
    );
    expect(correlationService.run).toHaveBeenCalledWith(
      'generated-uuid',
      expect.any(Function),
    );
    expect(next).toHaveBeenCalled();
  });
});
