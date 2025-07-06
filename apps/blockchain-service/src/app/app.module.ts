import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MONGO_CONFIG_TOKEN, mongoConfig } from '../configs/mongo.config';
import { TransactionsModule } from '../transactions/transactions.module';
import { etherConfig } from '../configs/ethers.config';
import { ThrottleProvider } from '../interceptors/throttle/throttle.provider';
import { ThrottleInterceptor } from '../interceptors/throttle/throttle.interceptor';
import { ContractsModule } from '../contracts/contracts.module';

const nodeEnv = process.env.NODE_ENV;

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: nodeEnv ? `${nodeEnv}.env` : '.env',
      isGlobal: true,
      load: [mongoConfig, etherConfig],
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
    ContractsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ThrottleProvider,
    {
      provide: APP_INTERCEPTOR,
      useClass: ThrottleInterceptor,
    },
  ],
})
export class AppModule {}
