import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true, collection: 'events' })
export class Event extends Document {
  @Prop({ required: true, index: true })
  contractAddress!: string;

  @Prop({ required: true })
  eventName!: string;

  @Prop({ required: true, index: true })
  blockNumber!: number;

  @Prop({ required: true, index: true })
  transactionHash!: string;

  @Prop({ required: true })
  logIndex!: number;

  @Prop({ required: true })
  timestamp!: Date;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  args!: Record<string, unknown>;
}

export const EventSchema = SchemaFactory.createForClass(Event);

// ✅ Create a compound unique index to prevent duplicate events
EventSchema.index({ transactionHash: 1, logIndex: 1 }, { unique: true });
