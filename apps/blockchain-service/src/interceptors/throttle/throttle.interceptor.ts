import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Semaphore } from 'async-mutex';
import { Observable, firstValueFrom, from } from 'rxjs';

import { IS_THROTTLED_KEY } from './throttle.decorator';
import { THROTTLE_SEMAPHORE_TOKEN } from './throttle.provider';

@Injectable()
export class ThrottleInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(THROTTLE_SEMAPHORE_TOKEN) private readonly semaphore: Semaphore,
  ) {}

  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const isThrottled = this.reflector.get<boolean>(
      IS_THROTTLED_KEY,
      context.getHandler(),
    );

    if (!isThrottled) {
      return next.handle();
    }

    return from(
      this.semaphore.runExclusive(() => firstValueFrom(next.handle())),
    );
  }
}
