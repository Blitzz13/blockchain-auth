import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import {
  WatchedContract,
  WatchedContractSchema,
} from './schemas/watched-contract.schema';
import { Event, EventSchema } from './schemas/event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WatchedContract.name, schema: WatchedContractSchema },
      { name: Event.name, schema: EventSchema },
    ]),
  ],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
