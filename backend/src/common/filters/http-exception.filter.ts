import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorResponse: any = { message };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        errorResponse = { message };
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        errorResponse = exceptionResponse;
        message = (exceptionResponse as any).message || message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorResponse = { message };

      // Логируем неизвестные ошибки только в development
      if (process.env.NODE_ENV === 'development') {
        this.logger.error('Unhandled exception', exception.stack);
      }
    }

    // Добавляем дополнительную информацию об ошибке
    errorResponse = {
      ...errorResponse,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // Логируем HTTP ошибки
    this.logger.error({
      message: `${request.method} ${request.url}`,
      status,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      error: message,
    });

    response.status(status).json(errorResponse);
  }
}

