import { IsNotEmpty } from 'class-validator';

export class UserUpdatePasswordDTO {
  @IsNotEmpty()
  currentPassword!: string;

  @IsNotEmpty()
  newPassword!: string;
}