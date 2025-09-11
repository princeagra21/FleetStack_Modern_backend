import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { randomUUID } from 'crypto';
import { WinstonLoggerService } from '../../logging/winston-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly winstonLogger: WinstonLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();
    
    // 1. Generate unique request ID
    const requestId = `req_${randomUUID().replace(/-/g, '').substring(0, 12)}`;
    
    // 2. Store ID in request object
    request.requestId = requestId;
    
    // 6. Add X-Request-ID header to response immediately (for both success and error cases) - Fastify compatibility
    if (typeof response.setHeader === 'function') {
      response.setHeader('X-Request-ID', requestId);
    } else if (response.header) {
      response.header('X-Request-ID', requestId);
    }
    
    const { method, originalUrl: url, body, headers } = request;
    const startTime = Date.now();

    // 3. Log the incoming request with requestId
    this.winstonLogger.logRequest(method, url, body, headers, requestId);

    return next.handle().pipe(
      tap((responseData) => {
        const responseTime = Date.now() - startTime;
        const statusCode = response.statusCode;

        // 5. Log successful response with requestId
        this.winstonLogger.logResponse(
          method,
          url,
          statusCode,
          responseTime,
          responseData,
          requestId
        );
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;
        const statusCode = response.statusCode || 500;

        // 5. Log error response with requestId
        this.winstonLogger.logResponse(
          method,
          url,
          statusCode,
          responseTime,
          { error: error.message, stack: error.stack },
          requestId
        );

        // Re-throw the error to maintain normal error handling flow
        return throwError(() => error);
      })
    );
  }
}