import { assertDefined } from '@blockchain-auth/shared';
import { registerAs } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';

const {
  MONGO_HOST,
  MONGO_PORT,
  MONGO_USERNAME,
  MONGO_PASSWORD,
  MONGO_DB_NAME,
  MONGO_AUTH_SOURCE,
} = process.env;

assertDefined(MONGO_HOST, 'MONGO_HOST');
assertDefined(MONGO_PORT, 'MONGO_PORT');
assertDefined(MONGO_USERNAME, 'MONGO_USERNAME');
assertDefined(MONGO_PASSWORD, 'MONGO_PASSWORD');
assertDefined(MONGO_DB_NAME, 'MONGO_DB_NAME');
assertDefined(MONGO_AUTH_SOURCE, 'MONGO_AUTH_SOURCE');

const options: MongooseModuleOptions = {
  uri: `mongodb://${MONGO_HOST}:${MONGO_PORT}`,
  dbName: MONGO_DB_NAME,
  authSource: MONGO_AUTH_SOURCE,
  auth: {
    username: MONGO_USERNAME,
    password: MONGO_PASSWORD,
  },
};

export const MONGO_CONFIG_TOKEN = 'mongo_config';
export const mongoConfig = registerAs(MONGO_CONFIG_TOKEN, () => options);
