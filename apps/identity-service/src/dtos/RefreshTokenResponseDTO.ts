import { IsNotEmpty } from "class-validator";

export class RefreshTokenResponseDTO {
    @IsNotEmpty()
    accessToken!: string;

    @IsNotEmpty()
    expiresIn!: string;
  }