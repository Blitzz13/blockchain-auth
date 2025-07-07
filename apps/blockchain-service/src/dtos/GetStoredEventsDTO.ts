import { IsNumberString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class GetEventsQueryDto {
  @IsOptional()
  @IsNumberString()
  @Type(() => Number)
  fromBlock?: number;

  @IsOptional()
  @IsNumberString()
  @Type(() => Number)
  toBlock?: number;
}
