/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Contract, EventLog, Log } from 'ethers';
import { MongoServerError } from 'mongodb';
import { NotFoundException } from '@nestjs/common';

import { ContractsService } from './contracts.service';
import { WatchedContract } from './schemas/watched-contract.schema';
import { Event } from './schemas/event.schema';

// Mock file system operations at the top level
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('[]'),
}));
jest.mock('path', () => ({
  resolve: jest.fn().mockReturnValue('mock/path/abi.json'),
}));

describe('ContractsService', () => {
  let service: ContractsService;
  let watchedContractModel: Model<WatchedContract>;
  let eventModel: Model<Event>;

  // Define mock implementations for our dependencies
  const mockWatchedContractModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockEventModel = {
    find: jest.fn(),
    create: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('wss://mock.url'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        {
          provide: getModelToken(WatchedContract.name),
          useValue: mockWatchedContractModel,
        },
        { provide: getModelToken(Event.name), useValue: mockEventModel },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ContractsService>(ContractsService);
    watchedContractModel = module.get<Model<WatchedContract>>(
      getModelToken(WatchedContract.name),
    );
    eventModel = module.get<Model<Event>>(getModelToken(Event.name));

    // Use fake timers to control setInterval/setTimeout in tests
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Clear all mock history AND restore original implementations
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize provider and restart all watchers', async () => {
      const initSpy = jest
        .spyOn(service as any, 'initializeProviderAndStartKeepAlive')
        .mockImplementation(() => {});
      const restartSpy = jest
        .spyOn(service as any, 'restartAllWatchers')
        .mockResolvedValue(undefined);

      await service.onModuleInit();
      expect(initSpy).toHaveBeenCalled();
      expect(restartSpy).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should clear the keep-alive interval', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      (service as any).keepAliveInterval = setTimeout(() => {}, 1000);
      void service.onModuleDestroy();
      expect(clearIntervalSpy).toHaveBeenCalledWith(
        (service as any).keepAliveInterval,
      );
    });
  });

  describe('getStoredEvents', () => {
    it('should fetch events and status with all filters', async () => {
      const address = '0x123';
      const query = { fromBlock: 100, toBlock: 200 };
      const mockQuery = { sort: jest.fn().mockResolvedValue([]) };

      mockEventModel.find.mockReturnValue(mockQuery as any);
      mockWatchedContractModel.findOne.mockResolvedValue({} as any);

      await service.getStoredEvents(address, query);

      expect(mockEventModel.find).toHaveBeenCalledWith({
        contractAddress: address.toLowerCase(),
        blockNumber: { $gte: 100, $lte: 200 },
      });
    });
  });

  describe('stopWatchingContract', () => {
    it('should stop an active watcher and remove its listener', async () => {
      const address = '0x123';
      const mockContract = { removeAllListeners: jest.fn() };

      (service as any).liveContracts.set(
        address.toLowerCase(),
        mockContract as unknown as Contract,
      );
      mockWatchedContractModel.findOneAndUpdate.mockResolvedValue({
        lastIndexedBlock: 12345,
      });

      const result = await service.stopWatchingContract(address);

      expect(mockWatchedContractModel.findOneAndUpdate).toHaveBeenCalled();
      expect(mockContract.removeAllListeners).toHaveBeenCalled();
      expect(result).toEqual({ status: 'stopped', lastIndexedBlock: 12345 });
    });

    it('should throw NotFoundException if watcher is not active', async () => {
      mockWatchedContractModel.findOneAndUpdate.mockResolvedValue(null);
      await expect(service.stopWatchingContract('0x123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('startWatchingContract', () => {
    it('should create a new watcher if one does not exist', async () => {
      const runIndexerSpy = jest
        .spyOn(service as any, 'runHybridIndexer')
        .mockImplementation(jest.fn());

      mockWatchedContractModel.findOne.mockResolvedValue(null);
      mockWatchedContractModel.create.mockResolvedValue({} as WatchedContract);

      await service.startWatchingContract('0x123', {
        eventSignature: 'Transfer()',
        fromBlock: 1,
      });

      expect(mockWatchedContractModel.create).toHaveBeenCalled();
      expect(runIndexerSpy).toHaveBeenCalled();
    });

    it('should reactivate an existing watcher', async () => {
      const runIndexerSpy = jest
        .spyOn(service as any, 'runHybridIndexer')
        .mockImplementation(jest.fn());
      const mockExistingWatcher = {
        isActive: false,
        eventSignature: '',
        save: jest.fn().mockResolvedValue(true),
      };

      mockWatchedContractModel.findOne.mockResolvedValue(mockExistingWatcher);

      await service.startWatchingContract('0x123', {
        eventSignature: 'Transfer()',
      });

      expect(mockExistingWatcher.save).toHaveBeenCalled();
      expect(runIndexerSpy).toHaveBeenCalled();
    });
  });

  describe('processEvent', () => {
    it('should save a parsed event and update the watcher', async () => {
      const mockEventLog = {
        eventName: 'Transfer',
        blockNumber: 1,
        transactionHash: '0xhash',
        index: 0,
        fragment: { inputs: [{ name: 'from', type: 'address' }] },
        args: ['0xfrom'],
        getBlock: jest.fn().mockResolvedValue({ timestamp: 1234567890 }),
      } as unknown as EventLog;

      await (service as any).processEvent('0x123', mockEventLog);
      expect(eventModel.create).toHaveBeenCalled();
      expect(watchedContractModel.updateOne).toHaveBeenCalledWith(
        { address: '0x123'.toLowerCase() },
        { $set: { lastIndexedBlock: 1 } },
      );
    });

    it('should handle duplicate key errors gracefully', async () => {
      const mockEventLog = {
        eventName: 'Transfer',
        blockNumber: 1,
        transactionHash: '0xhash',
        index: 0,
        fragment: { inputs: [] },
        args: [],
        getBlock: jest.fn().mockResolvedValue({ timestamp: 1234567890 }),
      } as unknown as EventLog;

      const mongoError = new MongoServerError({
        message: 'E11000 duplicate key error',
      });

      mongoError.code = 11000;
      mockEventModel.create.mockRejectedValue(mongoError);

      const loggerSpy = jest.spyOn((service as any).logger, 'debug');

      await (service as any).processEvent('0x123', mockEventLog);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate event skipped'),
      );
    });

    it('should skip unparsed logs but still update the watcher', async () => {
      const mockLog = { blockNumber: 1, transactionHash: '0xhash' } as Log;
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      await (service as any).processEvent('0x123', mockLog);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing UNPARSED log'),
      );
      expect(eventModel.create).not.toHaveBeenCalled();
      expect(watchedContractModel.updateOne).toHaveBeenCalledWith(
        { address: '0x123'.toLowerCase() },
        { $set: { lastIndexedBlock: 1 } },
      );
    });
  });
});
