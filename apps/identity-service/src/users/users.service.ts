import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { UserRegisterDto } from '../dtos/UserRegisterDTO';
import { User } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserLoginDto } from '../dtos/UserLoginDTO';
import bcrypt from "bcrypt";
import { JwtService } from '@nestjs/jwt';
import { LoginResponseDTO } from '../dtos/LoginResponseDTO';
import { ConfigService } from '@nestjs/config';

import { JWT_CONFIG_KEYS } from '../utils/config-keys';
import { TokensService } from '../tokens/token.service';
import { UserUpdateDto } from '../dtos/UserUpdateDTO';
import { UserUpdatePasswordDTO } from '../dtos/UserUpdatePasswordDTO';

@Injectable()
export class UsersService {
  private logger: Logger = new Logger(UsersService.name);
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private tokenService: TokensService,
  ) {}

  async create(createUserDto: UserRegisterDto): Promise<User> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async login(loginUserDto: UserLoginDto): Promise<LoginResponseDTO> {
    const user = await this.findByEmail(loginUserDto.email);
    this.logger.verbose("About to login user")
    if (!user) {
      throw new HttpException(`User with email ${loginUserDto.email} was not found`, HttpStatus.NOT_FOUND);
    }

    const isMatch = await bcrypt.compare(loginUserDto.password, user.password);

    if (!isMatch) {
      throw new HttpException(`Email and password are not mathcing for user ${loginUserDto.email}`, HttpStatus.UNAUTHORIZED);
    }

    this.tokenService.invalidateAllUserTokens(user.id)

    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get(JWT_CONFIG_KEYS.ACCESS_SECRET),
      expiresIn: this.configService.get(JWT_CONFIG_KEYS.ACCESS_EXPIRES_IN),
    });
  
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get(JWT_CONFIG_KEYS.REFRESH_SECRET),
      expiresIn: this.configService.get(JWT_CONFIG_KEYS.REFRESH_EXPIRES_IN),
    });
  
    const expiresIn = this.configService.get(JWT_CONFIG_KEYS.ACCESS_EXPIRES_IN);

    this.tokenService.saveTokens(user.id, accessToken, refreshToken);

    this.logger.verbose("Login completed succesfully");

    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresIn: expiresIn
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByUserId(id: string): Promise<User | null> {
    return this.userModel.findOne({ id }).exec();
  }

  async updateDetailsById(id: string, userUpdateDto: UserUpdateDto): Promise<User | null> {
    return this.userModel.findOneAndUpdate({ id }, { 
      email: userUpdateDto.email,
      username: userUpdateDto.username
    });
  }

  async updatePasswordById(id: string, userUpdateDto: UserUpdatePasswordDTO): Promise<void> {
    const user = await this.userModel.findOne({ id });
    
    if (!user) {
      throw new HttpException(`User was not found`, HttpStatus.NOT_FOUND);
    }

    const isMatch = await bcrypt.compare(userUpdateDto.currentPassword, user.password);

    if (!isMatch) {
      throw new HttpException('Current password is incorrect', HttpStatus.UNAUTHORIZED);
    }

    user.password = userUpdateDto.newPassword;
    await user.save();
  }
}
