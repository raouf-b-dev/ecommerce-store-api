import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CheckStockQueryDto } from './check-stock-query.dto';

function validate(query: Record<string, string>) {
  const dto = plainToInstance(CheckStockQueryDto, query);
  return { dto, errors: validateSync(dto) };
}

describe('CheckStockQueryDto', () => {
  it('accepts a missing quantity', () => {
    expect(validate({}).errors).toHaveLength(0);
  });

  it('converts a numeric string', () => {
    const { dto, errors } = validate({ quantity: '3' });
    expect(errors).toHaveLength(0);
    expect(dto.quantity).toBe(3);
  });

  it.each(['0', '-1', '1.5', 'abc'])('rejects quantity=%p', (quantity) => {
    expect(validate({ quantity }).errors).not.toHaveLength(0);
  });
});
