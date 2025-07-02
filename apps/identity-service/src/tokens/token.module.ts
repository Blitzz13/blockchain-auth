import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Token, TokenSchema } from './schema/token.schema';
import { TokensService } from './token.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }]),
  ],
  providers: [TokensService],
  exports: [TokensService, MongooseModule],
})
export class TokenModule {}