import { SetMetadata } from '@nestjs/common';

export const IS_THROTTLED_KEY = 'isThrottled';

export const Throttle = () => SetMetadata(IS_THROTTLED_KEY, true);
