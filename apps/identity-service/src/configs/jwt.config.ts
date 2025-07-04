import { registerAs } from '@nestjs/config';

import { assertDefined } from '../utils/utils';

const {
  JWT_ACCESS_SECRET,
  JWT_ACESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
  JWT_REFRESH_SECRET,
} = process.env;

assertDefined(JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET');
assertDefined(JWT_ACESS_EXPIRES_IN, 'JWT_ACESS_EXPIRES_IN');
assertDefined(JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');
assertDefined(JWT_REFRESH_EXPIRES_IN, 'JWT_REFRESH_EXPIRES_IN');

export const JWT_CONFIG_TOKEN = 'jwt_config';
export const jwtConfig = registerAs(JWT_CONFIG_TOKEN, () => ({
  access: {
    secret: JWT_ACCESS_SECRET,
    expiresIn: JWT_ACESS_EXPIRES_IN,
  },
  refresh: {
    secret: JWT_REFRESH_SECRET,
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  },
}));
