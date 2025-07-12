import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UserUpdatePasswordDTO {
  @ApiProperty({ example: 'securePassword' })
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ example: 'newMoreSecurePassword' })
  @IsNotEmpty()
  newPassword!: string;
}
