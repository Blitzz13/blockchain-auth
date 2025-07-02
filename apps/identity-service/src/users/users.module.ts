import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';
import { TokenModule } from '../tokens/token.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    TokenModule
  ],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}