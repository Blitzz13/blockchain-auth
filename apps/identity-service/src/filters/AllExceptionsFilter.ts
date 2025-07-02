import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message =
      exception instanceof HttpException
        ? exception.message || null
        : 'Internal server error';

    const errorMap: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error',
    };

    const errorText = errorMap[status] || 'Error';

    let details = {};
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        if ('message' in res && typeof res['message'] !== 'string') {
          details = { validationErrors: res['message'] };
        }
      }
    }

    const errorMessage = `HTTP Status: ${status} Error Message: ${message} Path: ${request.url}`

    if (status >= 500) {
      this.logger.error(
        errorMessage,
        (exception instanceof Error) ? exception.stack : '',
      );
  } else {
      this.logger.debug(errorMessage);
  }

    // Send custom JSON response
    response.status(status).json({
      error: errorText,
      message: message,
      details: details,
    });
  }
}