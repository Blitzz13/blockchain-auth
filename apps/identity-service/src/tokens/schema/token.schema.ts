import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ timestamps: true })
export class Token {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  accessToken!: string;

  @Prop({ required: true })
  refreshToken!: string;

  @Prop({ default: true })
  isValid!: boolean;
}

export const TokenSchema = SchemaFactory.createForClass(Token);