import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JsonRpcProvider, ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';

import { Transaction } from './schemas/transaction.schema';
import { BalanceResponseDTO } from '../dtos/BalanceResponseDTO';
import { ETHERS_CONFIG_KEYS } from '../utils/config-keys';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);
  private readonly provider = new JsonRpcProvider(
    this.configService.getOrThrow(ETHERS_CONFIG_KEYS.ETHERS_URL),
  );

  constructor(
    @InjectModel(Transaction.name) private readonly txModel: Model<Transaction>,
    private configService: ConfigService,
  ) {}

  public async getOrFetchTransactions(
    address: string,
    range: { fromBlock?: number; toBlock?: number | 'latest' },
  ) {
    const fromBlock = range.fromBlock ?? 0;
    const toBlock = range.toBlock ?? 'latest';

    // Fetch existing from DB
    const cached = await this.txModel.find({
      $or: [{ from: address }, { to: address }],
      blockNumber: {
        $gte: fromBlock,
        ...(toBlock !== 'latest' ? { $lte: toBlock } : {}),
      },
    });

    // TODO: Improve this with actual logic to detect missing ranges, or always fetch + dedupe
    const fetched = await this.fetchTransactionsFromChain(
      address,
      fromBlock,
      toBlock,
    );

    // Save new to DB (skip duplicates)
    const newTxs = await Promise.all(
      fetched.map(async (tx) => {
        const exists = await this.txModel.findOne({ hash: tx.hash });

        if (!exists) {
          return this.txModel.create(tx);
        }

        return null;
      }),
    );

    return [...cached, ...newTxs.filter(Boolean)];
  }

  public async fetchTransactionsFromChain(
    address: string,
    fromBlock: number,
    toBlock: number | 'latest',
  ) {
    this.logger.log(
      `Fetching transactions for ${address} from block ${fromBlock} to ${toBlock}`,
    );

    const latestBlock =
      toBlock === 'latest' ? await this.provider.getBlockNumber() : toBlock;
    const txs: Transaction[] = [];

    for (let i = fromBlock; i <= latestBlock; i++) {
      // Fetch block with full transactions
      const block = await this.provider.send('eth_getBlockByNumber', [
        ethers.hexlify('0x' + i.toString(16)),
        true,
      ]);

      if (!block || !block.transactions) {
        continue;
      }

      for (const tx of block.transactions) {
        if (
          tx.to?.toLowerCase() === address.toLowerCase() ||
          tx.from.toLowerCase() === address.toLowerCase()
        ) {
          txs.push({
            hash: tx.hash,
            from: tx.from,
            to: tx.to ?? '',
            value: tx.value.toString(),
            blockNumber: parseInt(block.number, 16),
            timestamp: new Date(parseInt(block.timestamp, 16) * 1000),
          } as Transaction);
        }
      }
    }

    return txs;
  }

  public async getBalanceForAddress(
    address: string,
  ): Promise<BalanceResponseDTO> {
    const lowercased = address.toLowerCase();
    const balanceWei = await this.provider.getBalance(lowercased);
    const balanceEth = ethers.formatEther(balanceWei);

    return {
      address: lowercased,
      balance: balanceEth,
      balanceWei: balanceWei.toString(),
      lastUpdated: new Date().toISOString(),
    };
  }
}
