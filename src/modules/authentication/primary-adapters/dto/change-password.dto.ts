import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'NewSecurePass123!', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
