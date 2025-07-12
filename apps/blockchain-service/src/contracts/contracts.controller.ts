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
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Fragment } from 'ethers';

import { ContractsService } from './contracts.service';
import { WatchContractDto } from '../dtos/WatchContractDTO';
import { GetEventsQueryDto } from '../dtos/GetStoredEventsDTO';

@ApiTags('Contracts')
@Controller('eth/contracts')
export class ContractsController {
  private readonly logger = new Logger(ContractsService.name);
  constructor(private readonly contractsService: ContractsService) {}

  @Get(':address/events')
  @ApiOperation({
    summary: 'Get indexed events for a contract',
    description:
      'Returns stored events and indexer status for a specific Ethereum contract address.',
  })
  @ApiParam({
    name: 'address',
    description: 'Ethereum contract address',
    example: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  })
  @ApiQuery({
    name: 'eventName',
    required: false,
    type: String,
    description: 'Filter by event name (e.g., Transfer)',
  })
  @ApiQuery({
    name: 'fromBlock',
    required: false,
    type: Number,
    description: 'Starting block number',
  })
  @ApiQuery({
    name: 'toBlock',
    required: false,
    type: Number,
    description: 'Ending block number',
  })
  @ApiResponse({
    status: 200,
    description: 'List of stored events with indexer status',
    schema: {
      example: {
        events: [
          {
            blockNumber: 1234567,
            transactionHash: '0xabc123def456...',
            data: {
              from: '0x...',
              to: '0x...',
              value: '1000000000000000000',
            },
            timestamp: '2024-07-04T12:34:56.000Z',
          },
        ],
        indexerStatus: {
          lastIndexedBlock: 12345678,
          isIndexing: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Contract not found or not being indexed',
  })
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
  @ApiOperation({
    summary: 'Start watching a contract',
    description:
      'Registers a new Ethereum contract to index events with a specific event signature.',
  })
  @ApiParam({
    name: 'address',
    description: 'Ethereum contract address',
    example: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  })
  @ApiBody({
    type: WatchContractDto,
    description: 'Event signature and optional ABI for indexing',
  })
  @ApiResponse({
    status: 201,
    description: 'Contract watch successfully started',
    schema: {
      example: {
        message: 'Started watching contract',
        contractAddress: '0x...',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid address or event signature',
  })
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

    return this.contractsService.startWatchingContract(
      address,
      watchContractDto,
    );
  }

  @Delete(':address/watch')
  @ApiOperation({
    summary: 'Stop watching a contract',
    description:
      'Removes the contract from indexing and stops listening to events.',
  })
  @ApiParam({
    name: 'address',
    description: 'Ethereum contract address',
    example: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  })
  @ApiResponse({
    status: 200,
    description: 'Stopped watching contract',
    schema: {
      example: {
        message: 'Stopped watching contract',
        contractAddress: '0x...',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid Ethereum address' })
  public async stopWatchingContract(@Param('address') address: string) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new BadRequestException('Invalid Ethereum address');
    }

    return this.contractsService.stopWatchingContract(address);
  }
}
