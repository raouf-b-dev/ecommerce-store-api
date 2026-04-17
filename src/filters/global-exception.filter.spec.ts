import { Test, TestingModule } from '@nestjs/testing';
import { GlobalExceptionFilter } from './global-exception.filter';
import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AppError } from '../shared-kernel/domain/exceptions/app.error';

class TestAppError extends AppError {
  constructor(message: string) {
    super(
      message,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'TEST_ERROR',
      undefined,
      false,
    );
  }
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockArgumentsHost: jest.Mocked<ArgumentsHost>;
  let mockResponse: any;
  let mockRequest: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlobalExceptionFilter],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);

    // Mock Express Request
    mockRequest = {
      method: 'GET',
      url: '/test-route',
    };

    // Mock Express Response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Mock ArgumentsHost
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;

    // Spy on logger to prevent console spam during tests
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.NODE_ENV;
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should handle BadRequestException (class-validator errors)', () => {
    const exception = new BadRequestException({
      message: ['name should not be empty', 'email must be an email'],
      error: 'Bad Request',
      statusCode: 400,
    });

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        errors: ['name should not be empty', 'email must be an email'],
      }),
    );
    expect(mockResponse.json.mock.calls[0][0]).toHaveProperty('timestamp');
  });

  it('should handle HttpException with code (e.g., from ResultInterceptor)', () => {
    const exception = new HttpException(
      {
        statusCode: 409,
        message: 'Record already exists',
        error: 'CONFLICT_ERROR',
      },
      409,
    );

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 409,
        message: 'Record already exists',
        code: 'CONFLICT_ERROR',
      }),
    );
  });

  it('should handle direct AppError escapes', () => {
    const exception = new TestAppError('A domain error occurred');

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'A domain error occurred',
        code: 'TEST_ERROR',
      }),
    );
  });

  describe('Unhandled Generic Errors', () => {
    it('should handle generic Error in development (includes stack and error details)', () => {
      process.env.NODE_ENV = 'development';
      const exception = new TypeError('Cannot read property of undefined');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      const jsonResponse = mockResponse.json.mock.calls[0][0];

      expect(jsonResponse).toEqual(
        expect.objectContaining({
          success: false,
          statusCode: 500,
          message: 'An unexpected server error occurred.',
          error: 'Cannot read property of undefined',
        }),
      );
      expect(jsonResponse).toHaveProperty('stack');
      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should handle generic Error in production (hides stack and error details)', () => {
      process.env.NODE_ENV = 'production';
      const exception = new TypeError('Cannot read property of undefined');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      const jsonResponse = mockResponse.json.mock.calls[0][0];

      expect(jsonResponse).toEqual({
        success: false,
        statusCode: 500,
        message: 'An unexpected server error occurred.',
        timestamp: expect.any(String),
      });
      expect(jsonResponse).not.toHaveProperty('stack');
      expect(jsonResponse).not.toHaveProperty('error');
      expect(jsonResponse).not.toHaveProperty('code');
      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should handle unknown non-Error objects gracefully', () => {
      process.env.NODE_ENV = 'development';
      const exception = 'Just a raw string thrown';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 500,
          message: 'An unexpected server error occurred.',
          error: 'An unknown error type was caught.',
        }),
      );
    });
  });
});
