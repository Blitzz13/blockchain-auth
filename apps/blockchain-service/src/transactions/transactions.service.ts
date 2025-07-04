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
  ): Promise<Transaction[]> {
    const lowercasedAddress = address.toLowerCase();

    const fromBlock = range.fromBlock ?? 0;
    const toBlock = range.toBlock ?? 'latest';

    const latestCachedTx = await this.txModel
      .findOne({
        $or: [{ from: lowercasedAddress }, { to: lowercasedAddress }],
      })
      .sort({ blockNumber: -1 });

    const startBlock = latestCachedTx
      ? latestCachedTx.blockNumber + 1
      : fromBlock;

    const fetchedPlainTxs = await this.fetchTransactionsFromChain(
      lowercasedAddress,
      startBlock,
      toBlock,
    );

    if (fetchedPlainTxs.length > 0) {
      this.logger.log(
        `Saving ${fetchedPlainTxs.length} new transactions to the database...`,
      );

      await this.txModel
        .insertMany(fetchedPlainTxs, { ordered: false })
        .catch((err) => {
          if (err.code !== 11000) {
            this.logger.error('Failed to insert transactions', err);
          }
        });
    }

    return this.txModel.find({
      $or: [{ from: lowercasedAddress }, { to: lowercasedAddress }],
      blockNumber: {
        $gte: fromBlock,
        ...(toBlock !== 'latest' ? { $lte: toBlock } : {}),
      },
    });
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

    const BATCH_SIZE = 15;

    const BATCH_DELAY_MS = 500;

    const allTxs: Transaction[] = [];
    const lowercasedAddress = address.toLowerCase();

    for (
      let batchStart = fromBlock;
      batchStart <= latestBlock;
      batchStart += BATCH_SIZE
    ) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, latestBlock);

      this.logger.log(`Preparing to fetch blocks ${batchStart} to ${batchEnd}`);

      const blockPromises = [];

      for (let i = batchStart; i <= batchEnd; i++) {
        const blockPromise = this.provider.send('eth_getBlockByNumber', [
          ethers.toQuantity(i),
          true,
        ]);

        blockPromises.push(blockPromise);
      }

      try {
        const blocks = await Promise.all(blockPromises);

        for (const block of blocks) {
          if (!block) {
            continue;
          }

          if (block.transactions) {
            for (const tx of block.transactions) {
              if (
                (tx.to && tx.to.toLowerCase() === lowercasedAddress) ||
                tx.from.toLowerCase() === lowercasedAddress
              ) {
                allTxs.push({
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

          if (block.withdrawals) {
            for (const withdrawal of block.withdrawals) {
              if (withdrawal.address.toLowerCase() === lowercasedAddress) {
                const syntheticHash = `withdrawal-${block.number}-${withdrawal.index}`;

                allTxs.push({
                  hash: syntheticHash,
                  from: '0x0000000000000000000000000000000000000000',
                  to: withdrawal.address,
                  value: (
                    BigInt(withdrawal.amount) * BigInt('1000000000')
                  ).toString(),
                  blockNumber: parseInt(block.number, 16),
                  timestamp: new Date(parseInt(block.timestamp, 16) * 1000),
                } as Transaction);
              }
            }
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to fetch batch ${batchStart}-${batchEnd}.`,
          error,
        );
      }

      await new Promise((res) => setTimeout(res, BATCH_DELAY_MS));
    }

    return allTxs;
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
