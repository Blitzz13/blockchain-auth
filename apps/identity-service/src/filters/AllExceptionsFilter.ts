import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception?.message;
    }

    if (status >= 500) {
        this.logger.error(
          `HTTP Status: ${status} Error Message: ${message}`,
          (exception instanceof Error) ? exception.stack : '',
        );
    } else {
        this.logger.debug(
            `HTTP Status: ${status} Error Message: ${message}`,
            // (exception instanceof Error) ? exception.stack : '',
          );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}