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
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserRegisterDto } from '../dtos/UserRegisterDTO';
import { LoginResponseDTO } from '../dtos/LoginResponseDTO';
import { RefreshTokenRequestDTO } from '../dtos/RefreshTokenRequestDTO';
import { RefreshTokenResponseDTO } from '../dtos/RefreshTokenResponseDTO';
import { UserLoginDto } from '../dtos/UserLoginDTO';
import { extractBearerToken } from '../utils/utils';
import { UserRegisterResponseDto } from '../dtos/UserRegisterResponseDTO';

@ApiTags('Auth') // Groups all endpoints under the "Auth" tag in Swagger UI
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private readonly usersService: UsersService,
    private readonly tokensService: AuthService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully created.',
    type: UserRegisterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request email already exists.',
  })
  public async register(
    @Body() userRegisterDto: UserRegisterDto,
  ): Promise<UserRegisterResponseDto> {
    const user = await this.usersService.create(userRegisterDto);

    return {
      id: user.id,
      createdAt: user.createdAt.toDateString(),
      email: user.email,
      username: user.username,
    };
  }

  @Post('login')
  @ApiOperation({ summary: 'Log in a user to get access and refresh tokens' })
  @ApiResponse({
    status: 200,
    description: 'Login successful.',
    type: LoginResponseDTO,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized (invalid credentials).',
  })
  public async login(
    @Body() userLoginDto: UserLoginDto,
  ): Promise<LoginResponseDTO> {
    return await this.usersService.login(userLoginDto);
  }

  @Post('logout')
  @ApiBearerAuth() // Indicates that this endpoint requires a bearer token
  @ApiHeader({
    name: 'authorization',
    description: 'Bearer access token',
    required: true,
  })
  @ApiOperation({ summary: 'Invalidate user tokens to log out' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 204, description: 'Logout successful.' })
  @ApiResponse({ status: 401, description: 'Unauthorized (invalid token).' })
  public async logout(@Headers('authorization') authHeader: string) {
    const token = await extractBearerToken(
      authHeader,
      this.tokensService,
      this.logger,
    );

    await this.tokensService.invalidateTokensByAccessToken(token);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh an access token using a refresh token' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully.',
    type: RefreshTokenResponseDTO,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized (invalid refresh token).',
  })
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
