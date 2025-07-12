import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import bcrypt from 'bcrypt';

import { UserRegisterDto } from '../dtos/UserRegisterDTO';
import { User } from './schemas/user.schema';
import { UserLoginDto } from '../dtos/UserLoginDTO';
import { LoginResponseDTO } from '../dtos/LoginResponseDTO';
import { AuthService } from '../auth/auth.service';
import { UserUpdateDto } from '../dtos/UserUpdateDTO';
import { UserUpdatePasswordDTO } from '../dtos/UserUpdatePasswordDTO';
import { TSignPayload } from '../types/TSignPayload';

@Injectable()
export class UsersService {
  private logger: Logger = new Logger(UsersService.name);
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private tokenService: AuthService,
  ) {}

  public async create(createUserDto: UserRegisterDto): Promise<User> {
    const user = await this.findByEmail(createUserDto.email);

    if (user) {
      throw new HttpException(
        `User with email ${createUserDto.email} already exists`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const createdUser = new this.userModel(createUserDto);

    return createdUser.save();
  }

  public async login(loginUserDto: UserLoginDto): Promise<LoginResponseDTO> {
    const user = await this.findByEmail(loginUserDto.email);

    this.logger.verbose('About to login user');
    if (!user) {
      throw new HttpException(
        `User with email ${loginUserDto.email} was not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const isMatch = await bcrypt.compare(loginUserDto.password, user.password);

    if (!isMatch) {
      throw new HttpException(
        `Email and password are not mathcing for user ${loginUserDto.email}`,
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.tokenService.invalidateAllUserTokens(user.id);

    const payload: TSignPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };

    const { accessToken, refreshToken, expiresIn } =
      await this.tokenService.generateTokens(payload);

    await this.tokenService.saveTokens(user.id, accessToken, refreshToken);

    this.logger.verbose('Login completed succesfully');

    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresIn: expiresIn,
    };
  }

  public async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  public async findByUserId(id: string): Promise<User | null> {
    return this.userModel.findOne({ id }).exec();
  }

  public async updateDetailsById(
    id: string,
    userUpdateDto: UserUpdateDto,
  ): Promise<User | null> {
    return this.userModel.findOneAndUpdate(
      { id },
      {
        email: userUpdateDto.email,
        username: userUpdateDto.username,
      },
      { new: true },
    );
  }

  public async updatePasswordById(
    id: string,
    userUpdateDto: UserUpdatePasswordDTO,
  ): Promise<void> {
    const user = await this.userModel.findOne({ id });

    if (!user) {
      throw new HttpException(`User was not found`, HttpStatus.NOT_FOUND);
    }

    const isMatch = await bcrypt.compare(
      userUpdateDto.currentPassword,
      user.password,
    );

    if (!isMatch) {
      throw new HttpException(
        'Current password is incorrect',
        HttpStatus.UNAUTHORIZED,
      );
    }

    user.password = userUpdateDto.newPassword;
    await user.save();
  }
}
