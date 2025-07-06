import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
} from '@nestjs/common';

import { ContractsService } from './contracts.service';
import { WatchContractDto } from '../dtos/WatchContractDTO';

@Controller('eth/contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post(':address/watch')
  public async watchContract(
    @Param('address') address: string,
    @Body() watchContractDto: WatchContractDto,
  ) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new BadRequestException('Invalid Ethereum address');
    }

    // We will create this service method next
    return this.contractsService.startWatchingContract(
      address,
      watchContractDto,
    );
  }
}
