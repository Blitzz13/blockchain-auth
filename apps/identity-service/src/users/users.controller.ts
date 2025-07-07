import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Put,
} from '@nestjs/common';

import { UpdatedUserDto } from '../dtos/UpdatedUserDTO';
import { UserProfileDto } from '../dtos/UserProfileDTO';
import { UserUpdateDto } from '../dtos/UserUpdateDTO';
import { UserUpdatePasswordDTO } from '../dtos/UserUpdatePasswordDTO';
import { UsersService } from './users.service';
import { extractBearerToken } from '../utils/utils';
import { AuthService } from '../auth/auth.service';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  constructor(
    private readonly usersService: UsersService,
    private readonly tokensService: AuthService,
  ) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  public async getUserByToken(
    @Headers('authorization') authHeader: string,
  ): Promise<UserProfileDto> {
    const token = await extractBearerToken(
      authHeader,
      this.tokensService,
      this.logger,
    );

    const userId = await this.tokensService.getUserIdByToken(token);

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

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Put('me')
  @HttpCode(HttpStatus.OK)
  public async updateUserProfileByToken(
    @Headers('authorization') authHeader: string,
    @Body() userUpdateDto: UserUpdateDto,
  ): Promise<UpdatedUserDto> {
    const token = await extractBearerToken(
      authHeader,
      this.tokensService,
      this.logger,
    );

    const userId = await this.tokensService.getUserIdByToken(token);

    if (!userId) {
      throw new HttpException(
        'Userid not found in token schema',
        HttpStatus.NOT_FOUND,
      );
    }

    const user = await this.usersService.updateDetailsById(
      userId,
      userUpdateDto,
    );

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      updatedAt: user.updatedAt,
    };
  }

  @Put('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async updateUserPasswordByToken(
    @Headers('authorization') authHeader: string,
    @Body() userUpdateDto: UserUpdatePasswordDTO,
  ): Promise<void> {
    const token = await extractBearerToken(
      authHeader,
      this.tokensService,
      this.logger,
    );

    const userId = await this.tokensService.getUserIdByToken(token);

    if (!userId) {
      throw new HttpException(
        'Userid not found for the token',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.usersService.updatePasswordById(userId, userUpdateDto);
  }
}
