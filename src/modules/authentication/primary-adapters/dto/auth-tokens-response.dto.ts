import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthTokensResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  accessToken!: string;

  @ApiPropertyOptional({
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    description:
      'Refresh token (also set as HttpOnly cookie on login, refresh, and change-password)',
  })
  refreshToken?: string;

  @ApiProperty({
    example: false,
    description:
      'When true, the client must complete password rotation before calling domain APIs',
  })
  mustChangePassword!: boolean;
}
