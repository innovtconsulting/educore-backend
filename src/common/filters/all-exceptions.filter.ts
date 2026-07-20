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
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as any).message || exception.message
        : 'Erreur interne du serveur';

    // Log toutes les erreurs 500 avec la stack trace complète
    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} → HTTP ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: Array.isArray(message) ? message[0] : message,
      error: exception instanceof HttpException ? exception.name : 'Error',
      // En dehors de la prod, expose le message réel pour faciliter le debug
      ...(process.env.NODE_ENV !== 'production' && status >= 500
        ? {
            detail:
              exception instanceof Error
                ? exception.message
                : String(exception),
          }
        : {}),
    });
  }
}
