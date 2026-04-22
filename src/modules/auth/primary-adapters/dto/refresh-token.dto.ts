import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'The refresh token. Optional when sent via HttpOnly cookie.',
    required: false,
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
