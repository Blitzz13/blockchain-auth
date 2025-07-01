import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { CallbackError } from 'mongoose';

@Schema({ timestamps: true })
export class User {
  @Prop({
    required: true,
    default: uuidv4,
    unique: true,
  })
  id!: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email!: string;

  @Prop({ required: true, unique: true })
  username!: string;

  @Prop({ required: true })
  password!: string;

  createdAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', async function (next) {
  const user = this as User & { isModified: (field: string) => boolean };

  // Only hash if the password field is modified or new
  if (!user.isModified('password')) {
    return next();
  }

  try {
    const saltRounds = 10;
    const hashed = await bcrypt.hash(user.password, saltRounds);
    user.password = hashed;
    next();
  } catch (err) {
    next(err as CallbackError);
  }
});

// Ensure "id" is not overridden by MongoDB's default _id
UserSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    delete ret._id;
    delete ret.__v;
  },
});