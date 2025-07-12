import { HttpException, HttpStatus, Logger } from '@nestjs/common';

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
  tokensService: { isAccessTokenValid: (token: string) => boolean },
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

  let validAccessToken: boolean;

  try {
    validAccessToken = await tokensService.isAccessTokenValid(token);
  } catch (error) {
    throw new Error(`Error while trying to validate the token: Error ${error}`);
  }

  if (!validAccessToken) {
    throw new HttpException('Token is invalid', HttpStatus.UNAUTHORIZED);
  }

  logger.verbose('Extracted token:', token);

  return token;
}
