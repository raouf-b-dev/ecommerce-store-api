import { DECORATORS } from '@nestjs/swagger';
import { ErrorCode } from '../../shared-kernel/domain/exceptions/error-code';
import { ErrorResponseDto } from './error-response.dto';

describe('ErrorResponseDto', () => {
  it('documents common error codes on OpenAPI code without a closed enum', () => {
    const meta: unknown = Reflect.getMetadata(
      DECORATORS.API_MODEL_PROPERTIES,
      ErrorResponseDto.prototype,
      'code',
    );

    expect(meta).toEqual(
      expect.objectContaining({
        type: String,
        example: ErrorCode.ORDER_NOT_FOUND,
      }),
    );

    expect(meta).not.toEqual(
      expect.objectContaining({ enum: expect.anything() }),
    );

    const description =
      meta !== null &&
      typeof meta === 'object' &&
      'description' in meta &&
      typeof meta.description === 'string'
        ? meta.description
        : '';

    expect(description).toContain('"ORDER_NOT_FOUND"');
    expect(description).toContain('"PAYMENT_NOT_FOUND"');
    expect(description).toContain('"UNAUTHORIZED"');
    expect(description).toContain('"FORBIDDEN"');
    expect(description.toLowerCase()).toContain('not exhaustive');
  });
});
