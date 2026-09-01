import { ApiProperty } from '@nestjs/swagger';

export class JwkKeyDto {
  @ApiProperty({ type: String, example: 'RSA' })
  kty!: string;

  @ApiProperty({ type: String, example: 'sig' })
  use!: string;

  @ApiProperty({ type: String, example: 'RS256' })
  alg!: string;

  @ApiProperty({ type: String, example: 'store-api-key-1' })
  kid!: string;

  @ApiProperty({ type: String, example: 'AQAB' })
  n!: string;

  @ApiProperty({ type: String, example: 'AQAB' })
  e!: string;
}

export class JwksResponseDto {
  @ApiProperty({ type: [JwkKeyDto] })
  keys!: JwkKeyDto[];
}
