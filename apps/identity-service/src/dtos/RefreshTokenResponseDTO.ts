import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class RefreshTokenResponseDTO {
  @ApiProperty({ example: 'token' })
  @IsNotEmpty()
  accessToken!: string;

  @ApiProperty({ example: '2h' })
  @IsNotEmpty()
  expiresIn!: string;
}
