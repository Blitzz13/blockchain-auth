import { JWT_CONFIG_TOKEN } from '../configs/jwt.config';

export const JWT_CONFIG_KEYS = {
  ACCESS_SECRET: `${JWT_CONFIG_TOKEN}.access.secret`,
  ACCESS_EXPIRES_IN: `${JWT_CONFIG_TOKEN}.access.expiresIn`,
  REFRESH_SECRET: `${JWT_CONFIG_TOKEN}.refresh.secret`,
  REFRESH_EXPIRES_IN: `${JWT_CONFIG_TOKEN}.refresh.expiresIn`,
};
