import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty({ example: 'b1a3b956-8b45-43b1-badb-123456789abc' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'username123' })
  username!: string;

  @ApiProperty({ example: '2025-07-01T20:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-07-01T20:05:00.000Z' })
  updatedAt!: Date;
}