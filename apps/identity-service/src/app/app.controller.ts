import { Body, Controller, Logger, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { UserRegisterDto } from '../dtos/UserRegisterDTO';
import { UsersService } from '../users/users.service';
import { UserLoginDto } from '../dtos/UserLoginDTO';
import { LoginResponseDTO } from '../dtos/LoginResponseDTO';
import { User } from '../users/schemas/user.schema';

@Controller()
export class AppController {
  private readonly logger: Logger = new Logger(AppController.name);
  
  constructor(private readonly usersService: UsersService) {}

  @Post("/auth/register")
  public async register(@Body() userRegisterDto: UserRegisterDto): Promise<User> {
    this.logger.debug(userRegisterDto instanceof UserRegisterDto)
    this.logger.log(`is it istanced from UserRegisterDto: ${userRegisterDto instanceof UserRegisterDto}`)
    this.logger.log("asd")
    return this.usersService.create(userRegisterDto);
  }

  @Post("/auth/login")
  public async login(@Body() userLoginDto: UserLoginDto): Promise<LoginResponseDTO> {
    return await this.usersService.login(userLoginDto);
  }
}
