import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'watched_contracts' })
export class WatchedContract extends Document {
  @Prop({ required: true, unique: true, index: true })
  address!: string;

  @Prop({ required: true })
  eventSignature!: string;

  @Prop({ required: true })
  lastIndexedBlock!: number;

  @Prop({ default: true })
  isActive!: boolean;
}

export const WatchedContractSchema =
  SchemaFactory.createForClass(WatchedContract);
