import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Token, TokenSchema } from './schema/token.schema';
import { TokensService } from './token.service';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JWT_CONFIG_KEYS } from '../utils/config-keys';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService): Promise<JwtModuleOptions> => ({
        secret: configService.getOrThrow<string>(JWT_CONFIG_KEYS.ACCESS_SECRET),
        signOptions: {
          expiresIn: configService.getOrThrow<string>(JWT_CONFIG_KEYS.ACCESS_EXPIRES_IN),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [TokensService],
  exports: [TokensService, MongooseModule],
})
export class TokenModule {}