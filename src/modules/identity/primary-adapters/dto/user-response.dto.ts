import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** List read model for GET /v1/users (matches UserListItemDTO). */
export class UserListItemResponseDto {
  @ApiProperty({ example: 123, description: 'User ID' })
  id!: number;

  @ApiProperty({ example: 'John', description: 'User first name' })
  firstName!: string;

  @ApiProperty({ example: 'Doe', description: 'User last name' })
  lastName!: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email',
  })
  email!: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'User phone number',
    nullable: true,
    type: String,
  })
  phone!: string | null;

  @ApiProperty({ example: true, description: 'Whether the account is active' })
  isActive!: boolean;

  @ApiPropertyOptional({
    example: 'CUSTOMER',
    description: 'Assigned role code',
    nullable: true,
    type: String,
  })
  roleCode!: string | null;

  @ApiProperty({
    example: '2025-10-31T10:00:00.000Z',
    description: 'User registration date',
  })
  createdAt!: string;
}

/** Detail read model for GET /v1/users/:id (matches UserDetailDTO). */
export class UserDetailResponseDto extends UserListItemResponseDto {
  @ApiProperty({
    example: 2,
    description: 'Number of addresses on the account',
  })
  addressCount!: number;

  @ApiProperty({
    example: '2025-10-31T12:30:00.000Z',
    description: 'Last update date',
  })
  updatedAt!: string;
}

/** Paginated list envelope for GET /v1/users. */
export class PaginatedUsersResponseDto {
  @ApiProperty({ type: [UserListItemResponseDto] })
  items!: UserListItemResponseDto[];

  @ApiProperty({ example: 4 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}
