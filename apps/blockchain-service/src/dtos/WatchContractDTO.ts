import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class WatchContractDto {
  @IsString()
  @IsNotEmpty()
  eventSignature!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fromBlock?: number;
}
