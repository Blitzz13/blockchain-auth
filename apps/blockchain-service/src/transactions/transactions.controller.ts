import { Controller, Get, Param, Query, BadRequestException } from '@nestjs/common';
import { TransactionsService } from '../transactions/transactions.service';

@Controller('eth')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('address/:address/transactions')
  async getTransactionsForAddress(
    @Param('address') address: string,
    @Query('fromBlock') fromBlock?: string,
    @Query('toBlock') toBlock?: string,
  ) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new BadRequestException('Invalid Ethereum address');
    }

    const transactions = await this.transactionsService.getOrFetchTransactions(address, {
      fromBlock: fromBlock ? parseInt(fromBlock) : undefined,
      toBlock: toBlock ? (toBlock === 'latest' ? 'latest' : parseInt(toBlock)) : 'latest',
    });

    return { transactions };
  }
}