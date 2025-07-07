import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Fragment } from 'ethers';

import { ContractsService } from './contracts.service';
import { WatchContractDto } from '../dtos/WatchContractDTO';
import { GetEventsQueryDto } from '../dtos/GetStoredEventsDTO';

@Controller('eth/contracts')
export class ContractsController {
  private readonly logger = new Logger(ContractsService.name);
  constructor(private readonly contractsService: ContractsService) {}

  @Get(':address/events')
  public async getEvents(
    @Param('address') address: string,
    @Query() query: GetEventsQueryDto,
  ) {
    const { events, status } = await this.contractsService.getStoredEvents(
      address,
      query,
    );

    if (!status) {
      throw new NotFoundException({
        message: 'Contract not found or not being indexed',
        error: 'ContractNotFound',
      });
    }

    const responseEvents = events.map((event) => ({
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
      data: {
        from: event.args.src,
        to: event.args.dst,
        value: event.args.wad,
      },
      timestamp: event.timestamp.toISOString(),
    }));

    return {
      events: responseEvents,
      indexerStatus: {
        lastIndexedBlock: status.lastIndexedBlock,
        isIndexing: status.isActive,
      },
    };
  }

  @Post(':address/watch')
  public async watchContract(
    @Param('address') address: string,
    @Body() watchContractDto: WatchContractDto,
  ) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new BadRequestException('Invalid Ethereum address');
    }

    try {
      Fragment.from(`event ${watchContractDto.eventSignature}`);
    } catch (error) {
      this.logger.warn(
        `Unexpected problem occured while parsing the event signature: ${error}`,
      );
      throw new BadRequestException({
        error: 'InvalidSignature',
        message: 'Invalid event signature format',
      });
    }

    // We will create this service method next
    return this.contractsService.startWatchingContract(
      address,
      watchContractDto,
    );
  }

  @Delete(':address/watch')
  public async stopWatchingContract(@Param('address') address: string) {
    // The address validation can be handled by a global pipe or done here
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new BadRequestException('Invalid Ethereum address');
    }

    return this.contractsService.stopWatchingContract(address);
  }
}
