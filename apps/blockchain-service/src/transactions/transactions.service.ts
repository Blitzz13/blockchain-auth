import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JsonRpcProvider, Log, ethers } from 'ethers';
import { Transaction } from './schemas/transaction.schema';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);
  private readonly provider = new JsonRpcProvider('x');

  constructor(
    @InjectModel(Transaction.name) private readonly txModel: Model<Transaction>,
  ) {}

  async getOrFetchTransactions(address: string, range: { fromBlock?: number; toBlock?: number | 'latest' }) {
    const fromBlock = range.fromBlock ?? 0;
    const toBlock = range.toBlock ?? 'latest';

    // Fetch existing from DB
    const cached = await this.txModel.find({
      $or: [{ from: address }, { to: address }],
      blockNumber: { $gte: fromBlock, ...(toBlock !== 'latest' ? { $lte: toBlock } : {}) },
    });

    // TODO: Improve this with actual logic to detect missing ranges, or always fetch + dedupe
    const fetched = await this.fetchTransactionsFromChain(address, fromBlock, toBlock);

    // Save new to DB (skip duplicates)
    const newTxs = await Promise.all(fetched.map(async (tx) => {
      const exists = await this.txModel.findOne({ hash: tx.hash });
      if (!exists) return this.txModel.create(tx);
      return null;
    }));

    return [...cached, ...newTxs.filter(Boolean)];
  }

  async fetchTransactionsFromChain(address: string, fromBlock: number, toBlock: number | 'latest') {
    this.logger.log(`Fetching transactions for ${address} from block ${fromBlock} to ${toBlock}`);
  
    const latestBlock = toBlock === 'latest' ? await this.provider.getBlockNumber() : toBlock;
    const txs: Transaction[] = [];
  
    for (let i = fromBlock; i <= latestBlock; i++) {
      // Fetch block with full transactions
      const block = await this.provider.send('eth_getBlockByNumber', [ethers.hexlify('0x' + i.toString(16)), true]);
  
      if (!block || !block.transactions) continue;
  
      for (const tx of block.transactions) {
        if (tx.to?.toLowerCase() === address.toLowerCase() || tx.from.toLowerCase() === address.toLowerCase()) {
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
}