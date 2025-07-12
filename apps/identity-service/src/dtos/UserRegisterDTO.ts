import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserRegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'username123' })
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'securePassword' })
  @IsNotEmpty()
  password!: string;
}
