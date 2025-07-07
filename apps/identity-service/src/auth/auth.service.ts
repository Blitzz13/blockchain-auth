import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { Token } from './schema/token.schema';
import { JWT_CONFIG_KEYS } from '../utils/config-keys';
import { TRefreshToken } from '../types/TRefreshToken';
import { TSignPayload } from '../types/TSignPayload';

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);
  constructor(
    @InjectModel(Token.name) private tokenModel: Model<Token>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  public async saveTokens(
    userId: string,
    accessToken: string,
    refreshToken: string,
  ) {
    this.logger.verbose(`Saving tokens for user ${userId}`);
    const newToken = new this.tokenModel({
      userId,
      accessToken,
      refreshToken,
      isValid: true,
    });

    return newToken.save();
  }

  public async invalidateTokensByAccessToken(accessToken: string) {
    return this.tokenModel.findOneAndUpdate(
      { accessToken },
      { isValid: false },
    );
  }

  public async invalidateTokensByRefreshToken(refreshToken: string) {
    return this.tokenModel.findOneAndUpdate(
      { refreshToken },
      { isValid: false },
    );
  }

  public async refreshToken(refreshToken: string, newAccessToken: string) {
    return this.tokenModel.findOneAndUpdate(
      { refreshToken },
      { accessToken: newAccessToken },
    );
  }

  public async getUserIdByToken(accessToken: string): Promise<string | null> {
    const tokenRecord = await this.tokenModel.findOne({ accessToken });

    return tokenRecord?.userId ?? null;
  }

  public async getUserIdByRefreshToken(
    refreshToken: string,
  ): Promise<string | null> {
    const tokenRecord = await this.tokenModel.findOne({ refreshToken });

    return tokenRecord?.userId ?? null;
  }

  public async isAccessTokenValid(accessToken: string): Promise<boolean> {
    const tokenRecord = await this.tokenModel.findOne({ accessToken });

    return this.validateTokenRecord(tokenRecord, true);
  }

  public async isRefreshTokenValid(refreshToken: string): Promise<boolean> {
    const tokenRecord = await this.tokenModel.findOne({ refreshToken });

    return this.validateTokenRecord(tokenRecord, false);
  }

  public async invalidateAllUserTokens(userId: string) {
    return this.tokenModel.updateMany({ userId }, { isValid: false });
  }

  public generateTokens(payload: TSignPayload): TRefreshToken {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get(JWT_CONFIG_KEYS.ACCESS_SECRET),
      expiresIn: this.configService.get(JWT_CONFIG_KEYS.ACCESS_EXPIRES_IN),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get(JWT_CONFIG_KEYS.REFRESH_SECRET),
      expiresIn: this.configService.get(JWT_CONFIG_KEYS.REFRESH_EXPIRES_IN),
    });

    const expiresIn = this.configService.get(JWT_CONFIG_KEYS.ACCESS_EXPIRES_IN);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  private validateTokenRecord(
    tokenRecord: Token | null,
    isRefresh: boolean,
  ): boolean {
    if (!tokenRecord) {
      throw Error('Token not found');
    }

    const tokenToValidate = isRefresh
      ? tokenRecord.refreshToken
      : tokenRecord.accessToken;

    if (
      !tokenRecord.isValid ||
      !this.jwtService.verify(tokenToValidate, {
        secret: isRefresh
          ? this.configService.get(JWT_CONFIG_KEYS.REFRESH_SECRET)
          : this.configService.get(JWT_CONFIG_KEYS.ACCESS_SECRET),
      })
    ) {
      return false;
    }

    return true;
  }
}
