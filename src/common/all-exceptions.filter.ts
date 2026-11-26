import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

// Maps thrown errors to meaningful HTTP responses with German messages.
// HttpExceptions (400/404/422 …) pass through; Postgres connectivity errors
// become 503; everything else becomes 500.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  private static readonly DB_DOWN_CODES = [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    '57P03', // cannot_connect_now
    '08006', // connection_failure
    '08001', // unable to establish connection
    '08004', // rejected connection
  ];

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      res
        .status(status)
        .json(typeof body === 'string' ? { statusCode: status, message: body } : body);
      return;
    }

    const code = (exception as { code?: string })?.code;
    if (code && AllExceptionsFilter.DB_DOWN_CODES.includes(code)) {
      this.logger.error(`Datenbank nicht erreichbar (${code}).`);
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        error: 'Service Unavailable',
        message: 'Die Datenbank ist derzeit nicht erreichbar. Bitte später erneut versuchen.',
      });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Interner Serverfehler.',
    });
  }
}
