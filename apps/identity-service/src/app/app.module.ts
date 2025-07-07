import { Module } from '@nestjs/common';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MONGO_CONFIG_TOKEN, mongoConfig } from '../configs/mongo.config';
import { UsersModule } from '../users/users.module';
import { jwtConfig } from '../configs/jwt.config';
import { AuthModule } from '../auth/auth.module';

const nodeEnv = process.env.NODE_ENV;

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: nodeEnv ? `${nodeEnv}.env` : '.env',
      isGlobal: true,
      load: [mongoConfig, jwtConfig],
    }), // loads .env variables
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService): MongooseModuleOptions => {
        const mongoConfig =
          configService.getOrThrow<MongooseModuleOptions>(MONGO_CONFIG_TOKEN);

        return mongoConfig;
      },
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
