import path from 'path';
import { readFileSync } from 'fs';

import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import {
  Contract,
  ContractEventPayload,
  EventLog,
  InterfaceAbi,
  Log,
  WebSocketProvider,
  ethers,
} from 'ethers';
import { ConfigService } from '@nestjs/config';
import { MongoServerError } from 'mongodb';

import { WatchedContract } from './schemas/watched-contract.schema';
import { Event } from './schemas/event.schema';
import { ETHERS_CONFIG_KEYS } from '../utils/config-keys';
import { WatchContractDto } from '../dtos/WatchContractDTO';
import { GetEventsQueryDto } from '../dtos/GetStoredEventsDTO';

@Injectable()
export class ContractsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ContractsService.name);
  private provider!: WebSocketProvider;
  private liveContracts = new Map<string, Contract>();
  private keepAliveInterval!: NodeJS.Timeout;
  private abi: InterfaceAbi;

  constructor(
    @InjectModel(WatchedContract.name)
    private readonly watchedContractModel: Model<WatchedContract>,
    @InjectModel(Event.name)
    private readonly eventModel: Model<Event>,
    private configService: ConfigService,
  ) {
    const abiPath = path.resolve(__dirname, './assets/abi.json');

    this.abi = JSON.parse(readFileSync(abiPath, 'utf-8'));
  }

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

  public async getStoredEvents(
    address: string,
    query: GetEventsQueryDto,
  ): Promise<{ events: Event[]; status: WatchedContract | null }> {
    const lowercasedAddress = address.toLowerCase();

    // 1. Build the filter for the events query
    const eventFilter: FilterQuery<Event> = {
      contractAddress: lowercasedAddress,
    };

    // Add block range filters if they were provided
    if (query.fromBlock || query.toBlock) {
      eventFilter.blockNumber = {};
      if (query.fromBlock) {
        eventFilter.blockNumber.$gte = query.fromBlock;
      }

      if (query.toBlock) {
        eventFilter.blockNumber.$lte = query.toBlock;
      }
    }

    // 2. Fetch the events and the watcher status in parallel
    const [events, status] = await Promise.all([
      this.eventModel.find(eventFilter).sort({ blockNumber: 'asc' }),
      this.watchedContractModel.findOne({ address: lowercasedAddress }),
    ]);

    return { events, status };
  }

  public async stopWatchingContract(address: string) {
    const lowercasedAddress = address.toLowerCase();

    const stoppedWatcher = await this.watchedContractModel.findOneAndUpdate(
      { address: lowercasedAddress, isActive: true },
      { $set: { isActive: false } },
      { new: false },
    );

    if (!stoppedWatcher) {
      throw new NotFoundException({
        message: 'Contract not found or not being indexed',
        error: 'ContractNotFound',
      });
    }

    // Find the active listener in memory and remove it to free up resources.
    const liveContract = this.liveContracts.get(lowercasedAddress);

    if (liveContract) {
      await liveContract.removeAllListeners(); // Detach the listener
      this.liveContracts.delete(lowercasedAddress); // Remove from our active map
      this.logger.debug(`Stopped live listener for ${lowercasedAddress}`);
    }

    // Return the required response object
    return {
      status: 'stopped',
      lastIndexedBlock: stoppedWatcher.lastIndexedBlock,
    };
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

        const contract = new ethers.Contract(address, this.abi, this.provider);
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
    const liveContract = new ethers.Contract(address, this.abi, this.provider);

    await liveContract.removeAllListeners(eventName);

    const listener = (...args: ContractEventPayload[]) => {
      const event = args[args.length - 1];

      this.logger.debug(
        `Live event received for ${address}! Block: ${event.log.blockNumber}`,
      );

      void this.processEvent(address, event.log);
    };

    await liveContract.on(eventName, listener);

    this.liveContracts.set(address, liveContract);
  }

  private async processEvent(address: string, event: Log | EventLog) {
    // Check if this is a fully parsed EventLog with arguments
    if ('args' in event) {
      this.logger.debug(
        `Processing PARSED event "${event.eventName}" from block ${event.blockNumber}`,
      );

      try {
        // ✅ Ethers 'args' is an array-like object; convert it to a plain object.
        const plainArgs: Record<string, unknown> = {};

        event.fragment.inputs.forEach((input, index) => {
          const value = event.args[index];

          plainArgs[input.name] =
            typeof value === 'bigint' ? value.toString() : value;
        });

        // Get the block timestamp
        const block = await event.getBlock();

        // Create the document in the database
        await this.eventModel.create({
          contractAddress: address.toLowerCase(),
          eventName: event.eventName,
          args: plainArgs,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          logIndex: event.index,
          timestamp: new Date(block.timestamp * 1000),
        });
      } catch (error) {
        // ✅ 2. Use the specific type in a type guard
        if (error instanceof MongoServerError && error.code === 11000) {
          // This is the expected duplicate key error.
          this.logger.debug(
            `Duplicate event skipped: Tx ${event.transactionHash}, LogIndex ${event.index}`,
          );
        } else {
          // Any other error is unexpected.
          this.logger.error('Failed to save event to database', error);
        }
      }
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
        void this.restartAllWatchers();
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
