import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JWT_CONFIG_KEYS } from '../utils/config-keys';
import { TokenModule } from '../tokens/token.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
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
    TokenModule
  ],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}