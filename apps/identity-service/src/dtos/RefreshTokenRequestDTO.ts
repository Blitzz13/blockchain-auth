import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class RefreshTokenRequestDTO {
  @ApiProperty({ example: 'token' })
  @IsNotEmpty()
  refreshToken!: string;
}
