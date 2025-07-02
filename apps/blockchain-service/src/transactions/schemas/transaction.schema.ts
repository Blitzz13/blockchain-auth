import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Transaction extends Document {
  @Prop({ required: true })
  hash!: string;

  @Prop({ required: true })
  from!: string;

  @Prop({ required: true })
  to!: string;

  @Prop({ required: true })
  value!: string;

  @Prop()
  blockNumber!: number;

  @Prop()
  timestamp!: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);