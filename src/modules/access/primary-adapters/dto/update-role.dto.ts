import { IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiProperty({ example: 'Administrador' })
  @IsString()
  name: string;

  @ApiProperty({
    example: [
      'manage_users',
      'view_all_inventory',
      'view_all_orders',
      'view_all_payments',
      'view_all_products',
      'view_all_users',
    ],
    description: 'List of permissions for the role',
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
