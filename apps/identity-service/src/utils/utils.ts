import { HttpException, HttpStatus, Logger } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';

export function assertDefined<T>(
  value: T | undefined | null,
  name: string,
): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error(`Expected '${name}' to be defined, but received ${value}`);
  }
}

export async function extractBearerToken(
  authHeader: string,
  tokensService: AuthService,
  logger: Logger,
): Promise<string> {
  if (!authHeader) {
    throw new HttpException(
      'Authorization header missing',
      HttpStatus.UNAUTHORIZED,
    );
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    throw new HttpException(
      'Token not found in Authorization header',
      HttpStatus.UNAUTHORIZED,
    );
  }

  const validAccessToken = await tokensService.isAccessTokenValid(token);

  if (!validAccessToken) {
    throw new HttpException('Token is invalid', HttpStatus.UNAUTHORIZED);
  }

  logger.verbose('Extracted token:', token);

  return token;
}
