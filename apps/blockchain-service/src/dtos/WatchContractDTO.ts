import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WatchContractDto {
  @ApiProperty({
    description: 'The full event signature including types',
    example:
      'Transfer(address indexed from, address indexed to, uint256 value)',
  })
  @IsString()
  @IsNotEmpty()
  eventSignature!: string;

  @ApiPropertyOptional({
    description: 'Block number to start watching from',
    example: 12345678,
    type: Number,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fromBlock?: number;
}
