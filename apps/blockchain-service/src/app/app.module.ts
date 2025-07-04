import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MONGO_CONFIG_TOKEN, mongoConfig } from '../configs/mongo.config';
import { TransactionsModule } from '../transactions/transactions.module';

const nodeEnv = process.env.NODE_ENV;

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: nodeEnv ? `${nodeEnv}.env` : '.env',
      isGlobal: true,
      load: [mongoConfig],
    }), // loads .env variables
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService): MongooseModuleOptions => {
        const mongoConfig =
          configService.getOrThrow<MongooseModuleOptions>(MONGO_CONFIG_TOKEN);

        return mongoConfig;
      },
      inject: [ConfigService],
    }),
    TransactionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
