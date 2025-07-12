import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class UserUpdateDto {
  @ApiProperty({ example: 'example@mail.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'username123' })
  @IsNotEmpty()
  username!: string;
}
