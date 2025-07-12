import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserRegisterResponseDto {
  @ApiProperty({ example: 'b1a3b956-8b45-43b1-badb-123456789abc' })
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'username123' })
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: '2025-07-01T20:00:00.000Z' })
  @IsNotEmpty()
  createdAt!: string;
}
