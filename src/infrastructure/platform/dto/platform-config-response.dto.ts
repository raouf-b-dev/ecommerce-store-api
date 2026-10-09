import { ApiProperty } from '@nestjs/swagger';

export class PlatformConfigResponseDto {
  @ApiProperty({
    example: 'USD',
    description: 'Default platform currency (ISO 4217 code)',
  })
  defaultCurrency!: string;

  @ApiProperty({
    example: 2,
    description:
      'Minor-unit decimal exponent for the default currency (e.g. 2 for USD, 0 for JPY, 3 for KWD)',
  })
  defaultCurrencyExponent!: number;

  @ApiProperty({
    example: ['USD'],
    description: 'Supported platform currencies (ISO 4217 codes)',
    type: [String],
  })
  supportedCurrencies!: string[];
}
