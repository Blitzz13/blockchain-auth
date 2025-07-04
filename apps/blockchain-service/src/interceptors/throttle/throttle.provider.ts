import { Provider } from '@nestjs/common';
import { Semaphore } from 'async-mutex';

export const THROTTLE_SEMAPHORE_TOKEN = 'THROTTLE_SEMAPHORE';

export const ThrottleProvider: Provider = {
  provide: THROTTLE_SEMAPHORE_TOKEN,
  // Define how many total concurrent RPC-heavy tasks can run app-wide
  // TODO: Add env var for this
  useValue: new Semaphore(3),
};
