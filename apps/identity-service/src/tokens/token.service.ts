import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Token } from "./schema/token.schema";
import { Model } from "mongoose";

@Injectable()
export class TokensService {
  private logger = new Logger(TokensService.name)
  constructor(@InjectModel(Token.name) private tokenModel: Model<Token>) {}

  async saveTokens(userId: string, accessToken: string, refreshToken: string) {
    this.logger.verbose(`Saving tokens for user ${userId}`);
    const newToken = new this.tokenModel({ userId, accessToken, refreshToken, isValid: true });
    return newToken.save();
  }

  async invalidateTokensByAccessToken(accessToken: string) {
    return this.tokenModel.findOneAndUpdate({ accessToken }, { isValid: false });
  }

  async invalidateTokensByRefreshToken(refreshToken: string) {
    return this.tokenModel.findOneAndUpdate({ refreshToken }, { isValid: false });
  }

  async getUserIdByToken(accessToken: string): Promise<string | null> {
    const tokenRecord = await this.tokenModel.findOne({ accessToken });
    return tokenRecord?.userId ?? null;
  }

  async isAccessTokenValid(accessToken: string): Promise<boolean> {
    const tokenRecord = await this.tokenModel.findOne({ accessToken });
    return !!tokenRecord && tokenRecord.isValid;
  }

  async isRefreshTokenValid(refreshToken: string): Promise<boolean> {
    const tokenRecord = await this.tokenModel.findOne({ refreshToken });
    return !!tokenRecord && tokenRecord.isValid;
  }

  async invalidateAllUserTokens(userId: string) {
    return this.tokenModel.updateMany({ userId }, { isValid: false });
  }
}