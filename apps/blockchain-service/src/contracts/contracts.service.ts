import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contract, EventLog, Log, WebSocketProvider, ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';

import { WatchedContract } from './schemas/watched-contract.schema';
import { ETHERS_CONFIG_KEYS } from '../utils/config-keys';
import { WatchContractDto } from '../dtos/WatchContractDTO';
import WethAbi from '../assets/abi.json';

@Injectable()
export class ContractsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ContractsService.name);
  private provider!: WebSocketProvider;

  private liveContracts = new Map<string, Contract>();
  private keepAliveInterval!: NodeJS.Timeout;

  constructor(
    @InjectModel(WatchedContract.name)
    private readonly watchedContractModel: Model<WatchedContract>,
    private configService: ConfigService,
  ) {}

  public async onModuleInit() {
    this.logger.log('Service initializing...');
    this.initializeProviderAndStartKeepAlive();
    await this.restartAllWatchers();
  }

  public async onModuleDestroy() {
    this.logger.log('Shutting down. Clearing keep-alive interval.');
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
  }

  public async startWatchingContract(address: string, dto: WatchContractDto) {
    const { eventSignature, fromBlock = 0 } = dto;
    const lowercasedAddress = address.toLowerCase();

    const existing = await this.watchedContractModel.findOne({
      address: lowercasedAddress,
    });

    if (existing) {
      existing.isActive = true;
      existing.eventSignature = eventSignature;
      await existing.save();
      this.logger.log(`Reactivated watcher for ${address}`);
    } else {
      await this.watchedContractModel.create({
        address: lowercasedAddress,
        eventSignature,
        lastIndexedBlock: fromBlock,
        isActive: true,
      });
      this.logger.log(`Created new watcher for ${address}`);
    }

    void this.runHybridIndexer(lowercasedAddress, eventSignature, fromBlock);

    return {
      status: 'started',
      contractAddress: address,
      eventSignature,
      startBlock: fromBlock,
    };
  }

  private async runHybridIndexer(
    address: string,
    eventSignature: string,
    startBlock: number,
  ) {
    const eventName = eventSignature.split('(')[0];

    try {
      this.logger.log(
        `Starting historical sync for ${address} from block ${startBlock}`,
      );
      const latestBlock = await this.provider.getBlockNumber();
      const BATCH_SIZE = 2000;
      let currentBlock = startBlock;

      while (currentBlock <= latestBlock) {
        const toBlock = Math.min(currentBlock + BATCH_SIZE - 1, latestBlock);

        if (currentBlock > toBlock) {
          break;
        }

        this.logger.debug(
          `Querying for "${eventName}" events from block ${currentBlock} to ${toBlock}`,
        );

        const contract = new ethers.Contract(address, WethAbi, this.provider);
        const events = await contract.queryFilter(
          eventName,
          currentBlock,
          toBlock,
        );

        if (events.length > 0) {
          this.logger.log(`Found ${events.length} past events in batch.`);
          for (const event of events) {
            await this.processEvent(address, event);
          }
        }

        await this.watchedContractModel.updateOne(
          { address },
          { $set: { lastIndexedBlock: toBlock } },
        );
        currentBlock = toBlock + 1;
      }
      this.logger.log(`Historical sync for ${address} complete.`);
      await this.startLiveListener(address, eventSignature);
    } catch (error) {
      this.logger.error(`Error during historical sync for ${address}:`, error);
      // ✅ FIXED: Explicitly ignore promise for scheduled retry
      setTimeout(
        () => void this.runHybridIndexer(address, eventSignature, startBlock),
        15000,
      );
    }
  }

  private async startLiveListener(address: string, eventSignature: string) {
    this.logger.log(
      `Attaching live listener for "${eventSignature}" on ${address}.`,
    );
    const eventName = eventSignature.split('(')[0];
    const liveContract = new ethers.Contract(address, WethAbi, this.provider);

    await liveContract.removeAllListeners(eventName);

    const listener = (...args: unknown[]) => {
      const event = args[args.length - 1] as EventLog;

      this.logger.log(
        `✅ Live event received for ${address}! Block: ${event.blockNumber}`,
      );
      void this.processEvent(address, event);
    };

    await liveContract.on(eventName, listener);

    this.liveContracts.set(address, liveContract);
  }

  private async processEvent(address: string, event: Log | EventLog) {
    // Check if this is a fully parsed EventLog with arguments
    if ('args' in event) {
      this.logger.log(
        `✅ Processing PARSED event "${event.eventName}" from block ${event.blockNumber}`,
      );
      // ... add logic to save the parsed event data ...
    } else {
      this.logger.warn(
        `Processing UNPARSED log from block ${event.blockNumber}. TxHash: ${event.transactionHash}`,
      );
    }

    await this.watchedContractModel.updateOne(
      { address: address.toLowerCase() },
      { $set: { lastIndexedBlock: event.blockNumber } },
    );
  }

  private initializeProviderAndStartKeepAlive() {
    const wssUrl = this.configService.getOrThrow(
      ETHERS_CONFIG_KEYS.ETHERS_WSS_URL,
    );

    this.logger.log(`Connecting to provider via WSS...`);
    this.provider = new WebSocketProvider(wssUrl);

    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    this.keepAliveInterval = setInterval(() => {
      this.logger.debug('Pinging WebSocket connection...');

      this.provider.getBlockNumber().catch(async (err) => {
        this.logger.error(
          'WebSocket connection lost! Attempting to reconnect...',
          err.message,
        );
        this.initializeProviderAndStartKeepAlive();
        // ✅ FIXED: Explicitly ignore promise for background task
        await this.restartAllWatchers();
      });
    }, 30000);
  }

  private async restartAllWatchers() {
    this.logger.log('Restarting all active watchers from database...');
    this.liveContracts.forEach((contract) => contract.removeAllListeners());
    this.liveContracts.clear();

    const activeWatchers = await this.watchedContractModel.find({
      isActive: true,
    });

    for (const watcher of activeWatchers) {
      this.logger.log(
        `Resuming watcher for ${watcher.address} on event "${watcher.eventSignature}"`,
      );
      void this.runHybridIndexer(
        watcher.address,
        watcher.eventSignature,
        watcher.lastIndexedBlock + 1,
      );
    }
  }
}
