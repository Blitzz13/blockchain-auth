import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Balance extends Document {
  @Prop({ required: true, unique: true })
  address!: string;

  @Prop({ required: true })
  balance!: string;

  @Prop()
  lastUpdated!: Date;
}

export const BalanceSchema = SchemaFactory.createForClass(Balance);
