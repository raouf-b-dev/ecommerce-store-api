import { ApiProperty } from '@nestjs/swagger';

export class RolePermissionsResponseDto {
  @ApiProperty({
    type: [String],
    example: ['view_all_users', 'manage_products'],
    description: 'Permission codes granted by this role',
  })
  codes!: string[];
}

/** Read model for GET /v1/roles (matches IRole). */
export class RoleResponseDto {
  @ApiProperty({ example: 1, description: 'Role ID' })
  id!: number;

  @ApiProperty({ example: 'CUSTOMER', description: 'Unique role code' })
  code!: string;

  @ApiProperty({ example: 'Customer', description: 'Display name' })
  name!: string;

  @ApiProperty({
    example: true,
    description: 'Whether this is a built-in system role',
  })
  isSystem!: boolean;

  @ApiProperty({ type: RolePermissionsResponseDto })
  permissions!: RolePermissionsResponseDto;

  @ApiProperty({
    example: '2025-10-31T10:00:00.000Z',
    description: 'Creation timestamp',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2025-10-31T12:00:00.000Z',
    description: 'Last update timestamp',
  })
  updatedAt!: Date;
}
