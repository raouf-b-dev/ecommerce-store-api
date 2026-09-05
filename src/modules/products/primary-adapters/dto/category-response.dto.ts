import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Electronics' })
  name!: string;

  @ApiProperty({ example: 'electronics' })
  slug!: string;

  @ApiPropertyOptional({
    example: 'Consumer electronics and gadgets',
    nullable: true,
    type: String,
  })
  description!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;
}
