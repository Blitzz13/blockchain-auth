import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Logger, Post, Put } from '@nestjs/common';
import { UserRegisterDto } from '../dtos/UserRegisterDTO';
import { UsersService } from '../users/users.service';
import { UserLoginDto } from '../dtos/UserLoginDTO';
import { LoginResponseDTO } from '../dtos/LoginResponseDTO';
import { User } from '../users/schemas/user.schema';
import { TokensService } from '../tokens/token.service';
import { UserProfileDto } from '../dtos/UserProfileDTO';
import { UpdatedUserDto } from '../dtos/UpdatedUserDTO';
import { UserUpdateDto } from '../dtos/UserUpdateDTO';
import { UserUpdatePasswordDTO } from '../dtos/UserUpdatePasswordDTO';
import { RefreshTokenRequestDTO } from '../dtos/RefreshTokenRequestDTO';
import { RefreshTokenResponseDTO } from '../dtos/RefreshTokenResponseDTO';

@Controller()
export class AppController {
  private readonly logger: Logger = new Logger(AppController.name);
  
  constructor(
    private readonly usersService: UsersService,
    private readonly tokensService: TokensService
  ) {}

  @Post("/auth/register")
  public async register(@Body() userRegisterDto: UserRegisterDto): Promise<User> {
    return this.usersService.create(userRegisterDto);
  }

  @Post("/auth/login")
  public async login(@Body() userLoginDto: UserLoginDto): Promise<LoginResponseDTO> {
    return await this.usersService.login(userLoginDto);
  }
  
  @Post("/auth/logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  public async logout(@Headers('authorization') authHeader: string) {
    const token = await this.extractBearerToken(authHeader);
  
    this.logger.verbose('Extracted token:', token);
  
    this.tokensService.invalidateTokensByAccessToken(token);
  }

  @Post("/auth/refresh")
  @HttpCode(HttpStatus.OK)
  public async refresh(@Body() refreshDto: RefreshTokenRequestDTO): Promise<RefreshTokenResponseDTO> {
    const isValidRefreshToken = await this.tokensService.isRefreshTokenValid(refreshDto.refreshToken);

    if (!isValidRefreshToken) {
      throw new HttpException('Refresh token is not valid', HttpStatus.UNAUTHORIZED);
    }

    const userId = await this.tokensService.getUserIdByRefreshToken(refreshDto.refreshToken);

    if (!userId) {
      throw new HttpException('Userid not found in token schema', HttpStatus.NOT_FOUND);
    }

    const user = await this.usersService.findByUserId(userId)

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const newToken = this.tokensService.generateTokens({
      userId: user.id,
      email: user.email,
      username: user.username,
    })
  
    this.tokensService.refreshToken(refreshDto.refreshToken, newToken.accessToken);

    return {
      accessToken: newToken.accessToken,
      expiresIn: newToken.expiresIn,
    }
  }
  
  @Get("/users/me")
  @HttpCode(HttpStatus.OK)
  public async getUserByToken(@Headers('authorization') authHeader: string): Promise<UserProfileDto> {
    const token = await this.extractBearerToken(authHeader);
  
    const userId = await this.tokensService.getUserIdByToken(token);
    if (!userId) {
      throw new HttpException('Userid not found in token schema', HttpStatus.NOT_FOUND);
    }

    const user = await this.usersService.findByUserId(userId)

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }

  @Put("/users/me")
  @HttpCode(HttpStatus.OK)
  public async updateUserProfileByToken(
    @Headers('authorization') authHeader: string,
    @Body() userUpdateDto: UserUpdateDto
  ): Promise<UpdatedUserDto> {
    const token = await this.extractBearerToken(authHeader);
  
    const userId = await this.tokensService.getUserIdByToken(token);
    if (!userId) {
      throw new HttpException('Userid not found in token schema', HttpStatus.NOT_FOUND);
    }

    const user = await this.usersService.updateDetailsById(userId, userUpdateDto);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      updatedAt: user.updatedAt,
    }
  }

  @Put("/users/me/password")
  @HttpCode(HttpStatus.NO_CONTENT)
  public async updateUserPasswordByToken(
    @Headers('authorization') authHeader: string,
    @Body() userUpdateDto: UserUpdatePasswordDTO
  ): Promise<void> {
    const token = await this.extractBearerToken(authHeader);
  
    const userId = await this.tokensService.getUserIdByToken(token);
    if (!userId) {
      throw new HttpException('Userid not found for the token', HttpStatus.NOT_FOUND);
    }

    await this.usersService.updatePasswordById(userId, userUpdateDto);
  }

  private async extractBearerToken(authHeader: string) {
    if (!authHeader) {
      throw new HttpException('Authorization header missing', HttpStatus.UNAUTHORIZED);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new HttpException('Token not found in Authorization header', HttpStatus.UNAUTHORIZED);
    }

    const validAccessToken = await this.tokensService.isAccessTokenValid(token);
    if (!validAccessToken) {
      throw new HttpException('Token is invalid', HttpStatus.UNAUTHORIZED);
    }

    this.logger.verbose('Extracted token:', token);
    return token;
  }
}
