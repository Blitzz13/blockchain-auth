import { IsNotEmpty } from 'class-validator';

export class RefreshTokenRequestDTO {
  @IsNotEmpty()
  refreshToken!: string;
}
