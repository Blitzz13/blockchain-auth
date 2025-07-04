import { IsNotEmpty } from 'class-validator';

export class BalanceResponseDTO {
  @IsNotEmpty()
  address!: string;

  @IsNotEmpty()
  balance!: string;

  @IsNotEmpty()
  balanceWei!: string;

  @IsNotEmpty()
  lastUpdated!: string;
}
