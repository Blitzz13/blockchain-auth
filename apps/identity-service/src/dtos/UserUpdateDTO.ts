import { IsEmail, IsNotEmpty } from 'class-validator';

export class UserUpdateDto {
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  username!: string;
}