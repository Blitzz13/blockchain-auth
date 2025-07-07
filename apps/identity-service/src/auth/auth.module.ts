import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Token, TokenSchema } from './schema/token.schema';
import { AuthService } from './auth.service';
import { JWT_CONFIG_KEYS } from '../utils/config-keys';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService,
      ): Promise<JwtModuleOptions> => ({
        secret: configService.getOrThrow<string>(JWT_CONFIG_KEYS.ACCESS_SECRET),
        signOptions: {
          expiresIn: configService.getOrThrow<string>(
            JWT_CONFIG_KEYS.ACCESS_EXPIRES_IN,
          ),
        },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => UsersModule),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, MongooseModule],
})
export class AuthModule {}
