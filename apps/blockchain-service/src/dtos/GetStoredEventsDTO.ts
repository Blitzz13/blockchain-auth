import { IsNumberString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetEventsQueryDto {
  @ApiPropertyOptional({
    description: 'Block number to start querying events from',
    example: 1000000,
    type: Number,
  })
  @IsOptional()
  @IsNumberString()
  @Type(() => Number)
  fromBlock?: number;

  @ApiPropertyOptional({
    description: 'Block number to stop querying events at',
    example: 1100000,
    type: Number,
  })
  @IsOptional()
  @IsNumberString()
  @Type(() => Number)
  toBlock?: number;
}
