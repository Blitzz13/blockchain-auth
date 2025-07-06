import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import {
  WatchedContract,
  WatchedContractSchema,
} from './schemas/watched-contract.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WatchedContract.name, schema: WatchedContractSchema },
    ]),
  ],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
