import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserRegisterDto } from '../dtos/UserRegisterDTO';
import { User } from '../users/schemas/user.schema';
import { LoginResponseDTO } from '../dtos/LoginResponseDTO';
import { RefreshTokenRequestDTO } from '../dtos/RefreshTokenRequestDTO';
import { RefreshTokenResponseDTO } from '../dtos/RefreshTokenResponseDTO';
import { UserLoginDto } from '../dtos/UserLoginDTO';
import { extractBearerToken } from '../utils/utils';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private readonly usersService: UsersService,
    private readonly tokensService: AuthService,
  ) {}

  @Post('register')
  public async register(
    @Body() userRegisterDto: UserRegisterDto,
  ): Promise<User> {
    return this.usersService.create(userRegisterDto);
  }

  @Post('login')
  public async login(
    @Body() userLoginDto: UserLoginDto,
  ): Promise<LoginResponseDTO> {
    return await this.usersService.login(userLoginDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async logout(@Headers('authorization') authHeader: string) {
    const token = await extractBearerToken(
      authHeader,
      this.tokensService,
      this.logger,
    );

    await this.tokensService.invalidateTokensByAccessToken(token);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  public async refresh(
    @Body() refreshDto: RefreshTokenRequestDTO,
  ): Promise<RefreshTokenResponseDTO> {
    const isValidRefreshToken = await this.tokensService.isRefreshTokenValid(
      refreshDto.refreshToken,
    );

    if (!isValidRefreshToken) {
      throw new HttpException(
        'Refresh token is not valid',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const userId = await this.tokensService.getUserIdByRefreshToken(
      refreshDto.refreshToken,
    );

    if (!userId) {
      throw new HttpException(
        'Userid not found in token schema',
        HttpStatus.NOT_FOUND,
      );
    }

    const user = await this.usersService.findByUserId(userId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const newToken = this.tokensService.generateTokens({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    await this.tokensService.refreshToken(
      refreshDto.refreshToken,
      newToken.accessToken,
    );

    return {
      accessToken: newToken.accessToken,
      expiresIn: newToken.expiresIn,
    };
  }
}
