import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty({ type: Number, example: 42 })
  id!: number;

  @ApiProperty({ type: String, example: 'Jane' })
  firstName!: string;

  @ApiProperty({ type: String, example: 'Doe' })
  lastName!: string;

  @ApiProperty({ type: String, example: 'jane.doe@example.com' })
  email!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '+1234567890',
  })
  phone!: string | null;

  @ApiProperty({ type: Boolean, example: true })
  isActive!: boolean;
}
