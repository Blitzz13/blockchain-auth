import { IsNotEmpty } from "class-validator";

export class LoginResponseDTO {
    @IsNotEmpty()
    accessToken!: string;
  
    @IsNotEmpty()
    refreshToken!: string;

    @IsNotEmpty()
    expiresIn!: string;
  }