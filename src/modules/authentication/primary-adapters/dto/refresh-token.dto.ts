import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    type: String,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description:
      'Optional JSON-body fallback refresh token. Browser clients should rely on the HttpOnly `refresh_token` cookie instead (cookie is read first).',
    required: false,
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
