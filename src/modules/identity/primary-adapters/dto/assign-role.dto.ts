import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty({
    example: 'ADMIN',
    description: 'Role code to assign or replace for the user',
  })
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'roleCode must be uppercase letters, digits, and underscores',
  })
  roleCode!: string;
}
