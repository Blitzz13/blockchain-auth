import { registerAs } from '@nestjs/config';

import { assertDefined } from '../utils/utils';

const { JSON_RPC_PROVIDER } = process.env;

assertDefined(JSON_RPC_PROVIDER, 'JSON_RPC_PROVIDER');

export const ETHERS_CONFIG_TOKEN = 'ethers_config';
export const etherConfig = registerAs(ETHERS_CONFIG_TOKEN, () => ({
  url: JSON_RPC_PROVIDER,
}));
