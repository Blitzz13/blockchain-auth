import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class LoginResponseDTO {
  @ApiProperty({ example: 'token' })
  @IsNotEmpty()
  accessToken!: string;

  @ApiProperty({ example: 'refreshToken' })
  @IsNotEmpty()
  refreshToken!: string;

  @ApiProperty({ example: '2h' })
  @IsNotEmpty()
  expiresIn!: string;
}
