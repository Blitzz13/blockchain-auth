import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { Fragment } from 'ethers';

import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { GetEventsQueryDto } from '../dtos/GetStoredEventsDTO';
import { WatchContractDto } from '../dtos/WatchContractDTO';

// Mock the ethers Fragment to control its behavior in tests
jest.mock('ethers', () => ({
  ...jest.requireActual('ethers'), // Keep other ethers functions real
  Fragment: {
    from: jest.fn(),
  },
}));

describe('ContractsController', () => {
  let controller: ContractsController;
  let service: ContractsService;

  // Create a mock implementation of the ContractsService
  const mockContractsService = {
    getStoredEvents: jest.fn(),
    startWatchingContract: jest.fn(),
    stopWatchingContract: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractsController],
      providers: [
        {
          provide: ContractsService,
          useValue: mockContractsService,
        },
        Logger, // Provide Logger since the controller uses it
      ],
    }).compile();

    controller = module.get<ContractsController>(ContractsController);
    service = module.get<ContractsService>(ContractsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getEvents', () => {
    it('should return formatted events and indexer status on success', async () => {
      const address = '0x123';
      const query: GetEventsQueryDto = {};
      const mockDbEvent = {
        blockNumber: 123,
        transactionHash: '0xabc',
        args: {
          src: '0xfrom',
          dst: '0xto',
          wad: '1000',
        },
        timestamp: new Date(),
      };
      const mockStatus = {
        lastIndexedBlock: 123,
        isActive: true,
      };

      mockContractsService.getStoredEvents.mockResolvedValue({
        events: [mockDbEvent],
        status: mockStatus,
      });

      const result = await controller.getEvents(address, query);

      expect(service.getStoredEvents).toHaveBeenCalledWith(address, query);
      expect(result.events[0].data.from).toBe('0xfrom');
      expect(result.indexerStatus.isIndexing).toBe(true);
    });

    it('should throw NotFoundException if status is not found', async () => {
      mockContractsService.getStoredEvents.mockResolvedValue({
        events: [],
        status: null,
      });

      await expect(controller.getEvents('0x123', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('watchContract', () => {
    it('should throw BadRequestException for an invalid address', async () => {
      const invalidAddress = '0x123';
      const dto: WatchContractDto = { eventSignature: 'Transfer()' };

      await expect(
        controller.watchContract(invalidAddress, dto),
      ).rejects.toThrow(new BadRequestException('Invalid Ethereum address'));
    });

    it('should throw BadRequestException for an invalid event signature', async () => {
      const address = '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9';
      const dto: WatchContractDto = { eventSignature: 'InvalidSignature' };

      // Simulate ethers.Fragment throwing an error
      (Fragment.from as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid signature format');
      });

      await expect(controller.watchContract(address, dto)).rejects.toThrow(
        new BadRequestException({
          error: 'InvalidSignature',
          message: 'Invalid event signature format',
        }),
      );
    });

    it('should call startWatchingContract on success', async () => {
      const address = '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9';
      const dto: WatchContractDto = {
        eventSignature: 'Transfer(address,address,uint256)',
      };

      // Simulate ethers.Fragment succeeding
      (Fragment.from as jest.Mock).mockImplementation(() => {});
      mockContractsService.startWatchingContract.mockResolvedValue({
        status: 'started',
      });

      await controller.watchContract(address, dto);

      expect(service.startWatchingContract).toHaveBeenCalledWith(address, dto);
    });
  });

  describe('stopWatchingContract', () => {
    it('should throw BadRequestException for an invalid address', async () => {
      await expect(
        controller.stopWatchingContract('invalid-address'),
      ).rejects.toThrow(new BadRequestException('Invalid Ethereum address'));
    });

    it('should call stopWatchingContract on success', async () => {
      const address = '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9';

      mockContractsService.stopWatchingContract.mockResolvedValue({
        status: 'stopped',
      });

      await controller.stopWatchingContract(address);

      expect(service.stopWatchingContract).toHaveBeenCalledWith(address);
    });
  });
});
