import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { UpdatedUserDto } from '../dtos/UpdatedUserDTO';
import { UserProfileDto } from '../dtos/UserProfileDTO';
import { UserUpdateDto } from '../dtos/UserUpdateDTO';
import { UserUpdatePasswordDTO } from '../dtos/UserUpdatePasswordDTO';
import { UsersService } from './users.service';
import { extractBearerToken } from '../utils/utils';
import { AuthService } from '../auth/auth.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  constructor(
    private readonly usersService: UsersService,
    private readonly tokensService: AuthService,
  ) {}

  @Get('me')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'authorization',
    description: 'Bearer access token',
    required: true,
  })
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user profile.',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User ID or user not found.',
  })
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
  @ApiBearerAuth()
  @ApiHeader({
    name: 'authorization',
    description: 'Bearer access token',
    required: true,
  })
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UserUpdateDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully updated user profile.',
    type: UpdatedUserDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
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
  @ApiBearerAuth()
  @ApiHeader({
    name: 'authorization',
    description: 'Bearer access token',
    required: true,
  })
  @ApiOperation({ summary: 'Update current user password' })
  @ApiBody({ type: UserUpdatePasswordDTO })
  @ApiResponse({
    status: 204,
    description: 'Password updated successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
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
