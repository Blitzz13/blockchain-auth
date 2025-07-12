import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BalanceResponseDTO {
  @ApiProperty({
    description: 'Ethereum address being queried',
    example: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  })
  @IsNotEmpty()
  address!: string;

  @ApiProperty({
    description: 'Balance in human-readable units (ETH)',
    example: '1.2345',
  })
  @IsNotEmpty()
  balance!: string;

  @ApiProperty({
    description: 'Balance in Wei (raw units)',
    example: '1234500000000000000',
  })
  @IsNotEmpty()
  balanceWei!: string;

  @ApiProperty({
    description: 'ISO timestamp of the last update',
    example: '2025-07-04T15:32:21.123Z',
  })
  @IsNotEmpty()
  lastUpdated!: string;
}
