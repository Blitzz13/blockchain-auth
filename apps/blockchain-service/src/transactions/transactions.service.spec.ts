/* eslint-disable @typescript-eslint/no-explicit-any */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

import { TransactionsService } from './transactions.service';
import { Transaction } from './schemas/transaction.schema';

// Mock external libraries at the top level
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('[]'),
}));
jest.mock('path', () => ({
  resolve: jest.fn().mockReturnValue('mock/path/abi.json'),
}));

// We will mock the provider's methods within the tests
const mockProviderInstance = {
  getBlockNumber: jest.fn(),
  getCode: jest.fn(),
  send: jest.fn(),
  getBalance: jest.fn(),
};

jest.mock('ethers', () => {
  const originalEthers = jest.requireActual('ethers');

  return {
    ...originalEthers,
    JsonRpcProvider: jest.fn().mockImplementation(() => mockProviderInstance),
  };
});

describe('TransactionsService', () => {
  let service: TransactionsService;

  const mockTransactionModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    insertMany: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('http://mock.url'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getModelToken(Transaction.name),
          useValue: mockTransactionModel,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrFetchTransactions', () => {
    // jest
    //   .spyOn(service, 'getOrFetchTransactions')
    //   .mockImplementationOnce(async () => {
    //     console.log('[mock] First call hangs...');

    //     return await new Promise<Transaction[]>(() => {}); // hangs forever
    //   })
    //   .mockImplementationOnce(async () => {
    //     console.log('[mock] Second call resolves...');

    //     return [];
    //   })
    //   .mockImplementationOnce(async () => {
    //     console.log('[mock] Recursive retry resolves...');

    //     return [];
    //   });
    it('should fetch new transactions if none are cached', async () => {
      const address = '0x123';

      mockTransactionModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      } as any);
      const fetchSpy = jest
        .spyOn(service as any, 'fetchTransactionsFromChain')
        .mockResolvedValue([]);

      mockTransactionModel.find.mockResolvedValue([]);

      await service.getOrFetchTransactions(address, { fromBlock: 0 });

      expect(fetchSpy).toHaveBeenCalled();
      expect(mockTransactionModel.find).toHaveBeenCalled();
    });

    it('should fetch transactions from the next block if some are cached', async () => {
      const address = '0x123';
      const lastTx = { blockNumber: 100 };

      mockTransactionModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(lastTx),
      } as any);
      const fetchSpy = jest
        .spyOn(service as any, 'fetchTransactionsFromChain')
        .mockResolvedValue([]);

      mockTransactionModel.find.mockResolvedValue([]);

      await service.getOrFetchTransactions(address, { fromBlock: 0 });

      expect(fetchSpy).toHaveBeenCalledWith(
        address.toLowerCase(),
        101, // lastTx.blockNumber + 1
        'latest',
      );
    });

    it('should use contract creation block if fromBlock is not provided', async () => {
      const address = '0x123';
      const creationBlock = 50;
      const findCreationBlockSpy = jest
        .spyOn(service as any, 'findContractCreationBlock')
        .mockResolvedValue(creationBlock);
      const fetchSpy = jest
        .spyOn(service as any, 'fetchTransactionsFromChain')
        .mockResolvedValue([]);

      mockTransactionModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      } as any);
      mockTransactionModel.find.mockResolvedValue([]);

      await service.getOrFetchTransactions(address, {}); // No fromBlock

      expect(findCreationBlockSpy).toHaveBeenCalled();
      expect(fetchSpy).toHaveBeenCalledWith(
        address.toLowerCase(),
        creationBlock,
        'latest',
      );
    });
  });

  describe('fetchTransactionsFromChain', () => {
    it('should fetch and process a single block correctly', async () => {
      const address = '0x123';
      const mockBlock = {
        number: '0x1',
        timestamp: '0x1',
        transactions: [
          { from: address, to: '0x456', hash: '0xabc', value: '0x1' },
        ],
        withdrawals: [{ address: address, amount: '0x1', index: '0x1' }],
      };

      mockProviderInstance.getBlockNumber.mockResolvedValue(1);
      mockProviderInstance.send.mockResolvedValue(mockBlock);

      // ✅ Test a single block range (from 1 to 1)
      const promise = service.fetchTransactionsFromChain(address, 1, 1);

      await jest.advanceTimersByTimeAsync(500); // Skip delay
      const result = await promise;

      // ✅ The assertion is now correct
      expect(result.length).toBe(2);
      expect(result[0].hash).toBe('0xabc');
      expect(result[1].hash).toBe('withdrawal-0x1-0x1');
    });

    it('should handle errors during batch fetching', async () => {
      mockProviderInstance.getBlockNumber.mockResolvedValue(1);
      mockProviderInstance.send.mockRejectedValue(new Error('RPC Error'));
      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      const promise = service.fetchTransactionsFromChain('0x123', 0, 1);

      // Advance timers to skip the BATCH_DELAY_MS
      await jest.advanceTimersByTimeAsync(500);
      await promise;

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch batch'),
        expect.any(Error),
      );
    });
  });

  describe('findContractCreationBlock', () => {
    it('should return null if address is not a contract', async () => {
      // This test is correct and should remain
      mockProviderInstance.getCode.mockResolvedValue('0x');
      const result = await (service as any).findContractCreationBlock('0x123');

      expect(result).toBeNull();
    });

    it('should find the creation block using binary search', async () => {
      const creationBlock = 500;

      mockProviderInstance.getBlockNumber.mockResolvedValue(1000);

      // ✅ Corrected mock that handles the 'latest' tag
      mockProviderInstance.getCode.mockImplementation(
        async (address: string, blockTag: number | 'latest') => {
          // Handle the initial check
          if (blockTag === 'latest') {
            return '0x01'; // Signifies it IS a contract
          }

          // Handle the binary search checks
          return blockTag >= creationBlock ? '0x01' : '0x';
        },
      );

      const result = await (service as any).findContractCreationBlock('0x123');

      expect(result).toBe(creationBlock);
    });
  });

  describe('getBalanceForAddress', () => {
    it('should return the formatted balance', async () => {
      const balanceWei = ethers.parseEther('1.5');

      mockProviderInstance.getBalance.mockResolvedValue(balanceWei);

      const result = await service.getBalanceForAddress('0x123');

      expect(result.balance).toBe('1.5');
      expect(result.balanceWei).toBe(balanceWei.toString());
    });
  });
});
