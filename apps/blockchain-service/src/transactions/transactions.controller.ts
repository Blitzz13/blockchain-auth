import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { TransactionsService } from '../transactions/transactions.service';

@ApiTags('Ethereum') // Groups the endpoints in Swagger UI
@Controller('eth')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('address/:address/transactions')
  @ApiOperation({
    summary: 'Get transactions for a specific Ethereum address',
    description:
      'Returns transactions related to the given Ethereum address within an optional block range.',
  })
  @ApiParam({
    name: 'address',
    description: 'Ethereum address to fetch transactions for',
    example: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  })
  @ApiQuery({
    name: 'fromBlock',
    required: false,
    type: String,
    description: 'Starting block number for filtering transactions',
    example: '1000000',
  })
  @ApiQuery({
    name: 'toBlock',
    required: false,
    type: String,
    description: 'Ending block number or "latest"',
    example: 'latest',
  })
  @ApiResponse({
    status: 200,
    description: 'List of transactions for the given address',
    schema: {
      example: {
        transactions: [
          {
            hash: '0x...',
            from: '0x...',
            to: '0x...',
            value: '1000000000000000000',
            blockNumber: 1234567,
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid Ethereum address' })
  public async getTransactionsForAddress(
    @Param('address') address: string,
    @Query('fromBlock') fromBlock?: string,
    @Query('toBlock') toBlock?: string,
  ) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new BadRequestException('Invalid Ethereum address');
    }

    const transactions = await this.transactionsService.getOrFetchTransactions(
      address,
      {
        fromBlock: fromBlock ? parseInt(fromBlock) : undefined,
        toBlock: toBlock
          ? toBlock === 'latest'
            ? 'latest'
            : parseInt(toBlock)
          : 'latest',
      },
    );

    return { transactions };
  }

  @Get('address/:address/balance')
  @ApiOperation({
    summary: 'Get ETH balance for an Ethereum address',
    description: 'Returns the ETH balance for the specified Ethereum address.',
  })
  @ApiParam({
    name: 'address',
    description: 'Ethereum address to check balance for',
    example: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  })
  @ApiResponse({
    status: 200,
    description: 'Balance in wei (as a string)',
    schema: {
      example: {
        balance: '1234567890000000000',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid Ethereum address' })
  public async getBalance(@Param('address') address: string) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new BadRequestException('Invalid Ethereum address');
    }

    return await this.transactionsService.getBalanceForAddress(address);
  }
}
