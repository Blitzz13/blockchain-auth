import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { UserRegisterDto } from '../dtos/UserRegisterDTO';
import { User } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserLoginDto } from '../dtos/UserLoginDTO';
import bcrypt from "bcrypt";
import { JwtModuleOptions, JwtService } from '@nestjs/jwt';
import { LoginResponseDTO } from '../dtos/LoginResponseDTO';
import { ConfigService } from '@nestjs/config';

import { JWT_CONFIG_KEYS } from '../utils/config-keys';

@Injectable()
export class UsersService {
  private logger: Logger = new Logger(UsersService.name);
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private configService: ConfigService
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

    // const token = this.jwtService.sign({username: user.username, email: user.email})  
    const accessToken = this.jwtService.sign(loginUserDto, {
      secret: this.configService.get(JWT_CONFIG_KEYS.ACCESS_SECRET),
      expiresIn: this.configService.get(JWT_CONFIG_KEYS.ACCESS_EXPIRES_IN),
    });
  
    const refreshToken = this.jwtService.sign(loginUserDto, {
      secret: this.configService.get(JWT_CONFIG_KEYS.REFRESH_SECRET),
      expiresIn: this.configService.get(JWT_CONFIG_KEYS.REFRESH_EXPIRES_IN),
    });
  
    const expiresIn = this.configService.get(JWT_CONFIG_KEYS.ACCESS_EXPIRES_IN);

    this.logger.verbose("Login completed succesfully")

    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresIn: expiresIn
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }
}
