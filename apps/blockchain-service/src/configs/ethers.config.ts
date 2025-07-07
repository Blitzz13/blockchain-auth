import { registerAs } from '@nestjs/config';

import { assertDefined } from '../utils/utils';

const { SEOPOLIA_WSS_URL, SEOPOLIA_HTTPS_URL } = process.env;

assertDefined(SEOPOLIA_HTTPS_URL, 'SEOPOLIA_HTTPS_URL');
assertDefined(SEOPOLIA_WSS_URL, 'SEOPOLIA_WSS_URL');

export const ETHERS_CONFIG_TOKEN = 'ethers_config';
// TODO: make a type for this
export const etherConfig = registerAs(ETHERS_CONFIG_TOKEN, () => ({
  httpUrl: SEOPOLIA_HTTPS_URL,
  wssUrl: SEOPOLIA_WSS_URL,
}));
