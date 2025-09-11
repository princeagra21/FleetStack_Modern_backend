import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { FastifyRequest } from 'fastify';
import { I18nContext } from 'nestjs-i18n';

/**
 * Error Logging Interceptor
 * 
 * This interceptor provides detailed error logging and metrics collection
 * for all application errors. It works in conjunction with the global
 * exception filter to provide comprehensive error tracking.
 * 
 * Features:
 * - Request/response correlation
 * - Performance metrics
 * - Error categorization
 * - User context tracking
 * - Structured logging
 */

@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const startTime = Date.now();
    
    // Extract request context
    const requestContext = this.extractRequestContext(request);

    return next.handle().pipe(
      tap(() => {
        // Log successful requests with timing
        const duration = Date.now() - startTime;
        this.logSuccess(requestContext, duration);
      }),
      catchError((error) => {
        // Log error details with context
        const duration = Date.now() - startTime;
        this.logError(error, requestContext, duration);
        
        // Re-throw the error to let the global filter handle it
        return throwError(() => error);
      })
    );
  }

  private extractRequestContext(request: FastifyRequest): RequestContext {
    return {
      requestId: (request as any).id || this.generateRequestId(),
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'] || 'unknown',
      ip: this.extractIP(request),
      timestamp: new Date().toISOString(),
      // Extract user context if available (from JWT)
      userId: (request as any).user?.sub,
      username: (request as any).user?.username,
      userRole: (request as any).user?.role,
    };
  }

  private logSuccess(context: RequestContext, duration: number): void {
    const i18n = I18nContext.current();
    let message = `✅ ${context.method} ${context.url} completed successfully`;
    
    if (i18n) {
      try {
        message = i18n.t('logs.api.request_completed', {
          args: { 
            method: context.method, 
            url: context.url, 
            duration: `${duration}ms`,
            status: 200 
          }
        }) || message;
      } catch (error) {
        // Fallback to original message if translation fails
      }
    }

    this.logger.log(message, {
      ...context,
      duration: `${duration}ms`,
      status: 'success',
    });
  }

  private logError(
    error: any,
    context: RequestContext,
    duration: number
  ): void {
    const errorInfo = this.analyzeError(error);
    const i18n = I18nContext.current();
    
    let logMessage = `❌ ${context.method} ${context.url} failed: ${errorInfo.message}`;
    
    if (i18n) {
      try {
        logMessage = i18n.t('logs.api.request_failed', {
          args: { 
            method: context.method, 
            url: context.url, 
            error: errorInfo.message 
          }
        }) || logMessage;
      } catch (err) {
        // Fallback to original message if translation fails
      }
    }
    
    // Choose log level based on error severity
    const logMethod = this.getLogMethod(errorInfo.severity);
    
    logMethod.call(this.logger, logMessage, {
      ...context,
      duration: `${duration}ms`,
      error: {
        name: errorInfo.name,
        message: errorInfo.message,
        type: errorInfo.type,
        severity: errorInfo.severity,
        statusCode: errorInfo.statusCode,
        isOperational: errorInfo.isOperational,
      },
      // Include stack trace only for unexpected errors
      ...(errorInfo.severity === 'critical' && { 
        stack: this.sanitizeStackTrace(error.stack) 
      }),
    });

    // Track error metrics (could be sent to monitoring service)
    this.trackErrorMetrics(errorInfo, context);
  }

  private analyzeError(error: any): ErrorAnalysis {
    const statusCode = error.getStatus?.() || error.status || 500;
    const name = error.name || 'UnknownError';
    const message = error.message || 'An unknown error occurred';

    // Categorize error type
    let type: ErrorType = 'unknown';
    let severity: ErrorSeverity = 'medium';
    let isOperational = true;

    // Determine error type and severity
    if (statusCode >= 500) {
      severity = 'critical';
      isOperational = false;
      
      if (this.isDatabaseError(error)) {
        type = 'database';
      } else if (this.isExternalServiceError(error)) {
        type = 'external_service';
      } else if (this.isSystemError(error)) {
        type = 'system';
        isOperational = false;
      } else {
        type = 'application';
      }
    } else if (statusCode >= 400) {
      severity = statusCode === 429 ? 'medium' : 'low';
      
      if (statusCode === 401 || statusCode === 403) {
        type = 'authentication';
      } else if (statusCode === 404) {
        type = 'not_found';
      } else if (statusCode === 409) {
        type = 'conflict';
      } else if (statusCode === 422) {
        type = 'validation';
      } else if (statusCode === 429) {
        type = 'rate_limit';
      } else {
        type = 'client_error';
      }
    }

    return {
      name,
      message,
      type,
      severity,
      statusCode,
      isOperational,
    };
  }

  private isDatabaseError(error: any): boolean {
    return (
      error.name?.includes('Prisma') ||
      error.message?.includes('database') ||
      error.code?.startsWith('P2')
    );
  }

  private isExternalServiceError(error: any): boolean {
    return (
      error.name?.includes('Axios') ||
      error.name?.includes('Fetch') ||
      error.message?.includes('ECONNREFUSED') ||
      error.message?.includes('timeout')
    );
  }

  private isSystemError(error: any): boolean {
    return (
      error.name === 'Error' &&
      (error.message?.includes('ENOMEM') ||
       error.message?.includes('EMFILE') ||
       error.message?.includes('spawn'))
    );
  }

  private getLogMethod(severity: ErrorSeverity) {
    switch (severity) {
      case 'critical':
        return this.logger.error;
      case 'high':
        return this.logger.error;
      case 'medium':
        return this.logger.warn;
      case 'low':
        return this.logger.log;
      default:
        return this.logger.warn;
    }
  }

  private trackErrorMetrics(errorInfo: ErrorAnalysis, context: RequestContext): void {
    // This could send metrics to external monitoring services
    // For now, we'll just log structured metrics
    this.logger.log('📊 Error Metrics', {
      metric: 'error_occurred',
      errorType: errorInfo.type,
      severity: errorInfo.severity,
      statusCode: errorInfo.statusCode,
      isOperational: errorInfo.isOperational,
      method: context.method,
      endpoint: context.url,
      userId: context.userId,
      userRole: context.userRole,
      timestamp: context.timestamp,
    });
  }

  private extractIP(request: FastifyRequest): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || 'unknown';
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeStackTrace(stack?: string): string | undefined {
    if (!stack) return undefined;
    
    return stack
      .split('\n')
      .filter(line => !line.includes('node_modules'))
      .filter(line => !line.includes('/usr/'))
      .slice(0, 8)
      .join('\n');
  }
}

// Type definitions for better type safety
interface RequestContext {
  requestId: string;
  method: string;
  url: string;
  userAgent: string;
  ip: string;
  timestamp: string;
  userId?: number;
  username?: string;
  userRole?: string;
}

interface ErrorAnalysis {
  name: string;
  message: string;
  type: ErrorType;
  severity: ErrorSeverity;
  statusCode: number;
  isOperational: boolean;
}

type ErrorType = 
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'rate_limit'
  | 'database'
  | 'external_service'
  | 'system'
  | 'application'
  | 'client_error'
  | 'unknown';

type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';