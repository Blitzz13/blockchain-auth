import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { TransactionsController } from './transactions.controller';
import { TransactionsService } from '../transactions/transactions.service';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let service: TransactionsService;

  // Create a mock implementation of the TransactionsService
  const mockTransactionsService = {
    getOrFetchTransactions: jest.fn(),
    getBalanceForAddress: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    service = module.get<TransactionsService>(TransactionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTransactionsForAddress', () => {
    const validAddress = '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9';

    it('should throw BadRequestException for an invalid address', async () => {
      const invalidAddress = '0x123';

      await expect(
        controller.getTransactionsForAddress(invalidAddress),
      ).rejects.toThrow(new BadRequestException('Invalid Ethereum address'));
    });

    it('should call the service with correct default parameters', async () => {
      mockTransactionsService.getOrFetchTransactions.mockResolvedValue([]);
      await controller.getTransactionsForAddress(validAddress);
      expect(service.getOrFetchTransactions).toHaveBeenCalledWith(
        validAddress,
        {
          fromBlock: undefined,
          toBlock: 'latest',
        },
      );
    });

    it('should parse fromBlock and toBlock correctly', async () => {
      mockTransactionsService.getOrFetchTransactions.mockResolvedValue([]);
      await controller.getTransactionsForAddress(validAddress, '100', '200');
      expect(service.getOrFetchTransactions).toHaveBeenCalledWith(
        validAddress,
        {
          fromBlock: 100,
          toBlock: 200,
        },
      );
    });

    it('should handle toBlock="latest" correctly', async () => {
      mockTransactionsService.getOrFetchTransactions.mockResolvedValue([]);
      await controller.getTransactionsForAddress(validAddress, '100', 'latest');
      expect(service.getOrFetchTransactions).toHaveBeenCalledWith(
        validAddress,
        {
          fromBlock: 100,
          toBlock: 'latest',
        },
      );
    });

    it('should return transactions wrapped in an object', async () => {
      const mockTransactions = [{ hash: '0xabc' }];

      mockTransactionsService.getOrFetchTransactions.mockResolvedValue(
        mockTransactions,
      );
      const result = await controller.getTransactionsForAddress(validAddress);

      expect(result).toEqual({ transactions: mockTransactions });
    });
  });

  describe('getBalance', () => {
    const validAddress = '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9';

    it('should throw BadRequestException for an invalid address', async () => {
      const invalidAddress = 'not-an-address';

      await expect(controller.getBalance(invalidAddress)).rejects.toThrow(
        new BadRequestException('Invalid Ethereum address'),
      );
    });

    it('should call getBalanceForAddress and return the result', async () => {
      const mockBalance = { balance: '1.23' };

      mockTransactionsService.getBalanceForAddress.mockResolvedValue(
        mockBalance,
      );
      const result = await controller.getBalance(validAddress);

      expect(service.getBalanceForAddress).toHaveBeenCalledWith(validAddress);
      expect(result).toEqual(mockBalance);
    });
  });
});
