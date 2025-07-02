import { IsEmail, IsNotEmpty } from 'class-validator';

export class UpdatedUserDto {
  @IsNotEmpty()
  id!: string;

  @IsEmail()
  email!: string;

  @IsEmail()
  username!: string;

  @IsNotEmpty()
  updatedAt!: Date;
}