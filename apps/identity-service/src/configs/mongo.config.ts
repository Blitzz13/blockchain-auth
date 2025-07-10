import { registerAs } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';

import { assertDefined } from '../utils/utils';

const {
  MONGO_HOST,
  MONGO_PORT,
  MONGO_USERNAME,
  MONGO_PASSWORD,
  MONGO_DB_NAME,
  MONGO_AUTH_SOURCE,
  MONGO_DNS_LOOKUP,
} = process.env;

assertDefined(MONGO_HOST, 'MONGO_HOST');
assertDefined(MONGO_DNS_LOOKUP, 'MONGO_DNS_LOOKUP');
assertDefined(MONGO_USERNAME, 'MONGO_USERNAME');
assertDefined(MONGO_PASSWORD, 'MONGO_PASSWORD');
assertDefined(MONGO_DB_NAME, 'MONGO_DB_NAME');

const options: MongooseModuleOptions = {
  uri: `${MONGO_DNS_LOOKUP}://${MONGO_HOST}${MONGO_PORT ? `:${MONGO_PORT}` : ''}`,
  dbName: MONGO_DB_NAME,
  authSource: MONGO_AUTH_SOURCE,
  auth: {
    username: MONGO_USERNAME,
    password: MONGO_PASSWORD,
  },
};

export const MONGO_CONFIG_TOKEN = 'mongo_config';
export const mongoConfig = registerAs(MONGO_CONFIG_TOKEN, () => options);
