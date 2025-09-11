import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';

/**
 * Global Exception Filter
 * 
 * This filter catches all unhandled exceptions across the application
 * and provides consistent error responses with proper logging.
 * 
 * Features:
 * - Standardized error response format
 * - Comprehensive error logging
 * - Database error handling (Prisma)
 * - Validation error handling
 * - Stack trace filtering for security
 * - Request context logging
 */

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const response = ctx.getResponse<FastifyReply>();
    
    const requestId = (request as any).id || 'unknown';
    const url = request.url;
    const method = request.method;
    const userAgent = request.headers['user-agent'] || 'unknown';
    const ip = this.extractIP(request);

    // Determine error type and status
    const errorResponse = this.buildErrorResponse(exception);
    const statusCode = errorResponse.statusCode;

    // Log the error with context
    this.logError(exception, {
      requestId,
      url,
      method,
      userAgent,
      ip,
      statusCode,
    });

    // Send standardized error response
    response.status(statusCode).send({
      success: false,
      error: errorResponse.error,
      message: errorResponse.message,
      statusCode,
      path: url,
      method,
      timestamp: new Date().toISOString(),
      requestId,
      ...(errorResponse.details && { 
        details: this.sanitizeErrorDetails(errorResponse.details) 
      }),
      // SECURITY: Never expose stack traces in production - CRITICAL
      ...(process.env.NODE_ENV === 'development' && { 
        stack: this.formatStackTrace(exception) 
      }),
    });
  }

  private buildErrorResponse(exception: unknown): {
    statusCode: number;
    error: string;
    message: string;
    details?: any;
  } {
    // Handle HTTP Exceptions (including custom exceptions)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      
      if (typeof response === 'object') {
        return {
          statusCode: status,
          error: (response as any).error || 'HTTP Exception',
          message: (response as any).message || exception.message,
          details: this.extractExceptionDetails(response),
        };
      }
      
      return {
        statusCode: status,
        error: 'HTTP Exception',
        message: typeof response === 'string' ? response : exception.message,
      };
    }

    // Handle Prisma Database Errors
    if (exception instanceof PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception);
    }

    // Handle Prisma Validation Errors
    if (exception instanceof PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Database Validation Error',
        message: 'Invalid data provided for database operation',
        details: {
          type: 'prisma_validation',
          // Never expose original message in production for security
          ...(process.env.NODE_ENV !== 'production' && {
            originalMessage: exception.message,
          }),
        },
      };
    }

    // Handle Validation Errors (class-validator)
    if (this.isValidationError(exception)) {
      return this.handleValidationError(exception);
    }

    // Handle Redis/Cache Errors
    if (this.isRedisError(exception)) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Cache Service Error',
        message: 'Cache operation failed',
        details: {
          type: 'redis_error',
          // Never expose Redis internal errors in production
          ...(process.env.NODE_ENV !== 'production' && {
            reason: (exception as Error).message,
          }),
        },
      };
    }

    // Handle JWT Errors
    if (this.isJWTError(exception)) {
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        error: 'Authentication Error',
        message: 'Invalid or expired token',
        details: {
          type: 'jwt_error',
          // Never expose JWT error reasons in production - security risk
          ...(process.env.NODE_ENV !== 'production' && {
            reason: (exception as Error).message,
          }),
        },
      };
    }

    // Handle unexpected errors
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      details: {
        type: 'unknown_error',
        name: (exception as Error)?.name || 'Unknown',
      },
    };
  }

  private handlePrismaError(error: PrismaClientKnownRequestError): {
    statusCode: number;
    error: string;
    message: string;
    details?: any;
  } {
    switch (error.code) {
      case 'P2000':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Database Validation Error',
          message: 'The provided value is too long for the database field',
          details: { 
            type: 'prisma_error',
            code: error.code,
            field: error.meta?.column_name,
          },
        };
      
      case 'P2001':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          error: 'Record Not Found',
          message: 'The requested record was not found in the database',
          details: { 
            type: 'prisma_error',
            code: error.code,
            model: error.meta?.model_name,
          },
        };
      
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          error: 'Unique Constraint Violation',
          message: 'A record with this value already exists',
          details: { 
            type: 'prisma_error',
            code: error.code,
            field: error.meta?.target,
          },
        };
      
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Foreign Key Constraint Violation',
          message: 'The referenced record does not exist',
          details: { 
            type: 'prisma_error',
            code: error.code,
            field: error.meta?.field_name,
          },
        };
      
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          error: 'Record Not Found',
          message: 'Record to update/delete was not found',
          details: { 
            type: 'prisma_error',
            code: error.code,
            cause: error.meta?.cause,
          },
        };
      
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Database Operation Error',
          message: 'A database operation failed',
          details: { 
            type: 'prisma_error',
            code: error.code,
          },
        };
    }
  }

  private handleValidationError(exception: any): {
    statusCode: number;
    error: string;
    message: string;
    details?: any;
  } {
    const constraints = exception.response?.message || [];
    
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Validation Error',
      message: Array.isArray(constraints) 
        ? constraints.join(', ')
        : 'Request validation failed',
      details: {
        type: 'validation_error',
        constraints: Array.isArray(constraints) ? constraints : [constraints],
      },
    };
  }

  private extractExceptionDetails(response: any): any {
    const details: any = {};
    
    // Extract common custom exception fields
    const customFields = [
      'errorCode', 'context', 'resourceType', 'identifier',
      'conflictField', 'conflictValue', 'field', 'value',
      'expectedFormat', 'serviceName', 'reason', 'retryAfter',
      'limit', 'windowMs', 'resetTime', 'operation', 'tableName',
      'key', 'action', 'resource', 'userRole', 'requiredRoles',
      'apiName', 'endpoint', 'externalStatusCode',
    ];

    customFields.forEach(field => {
      if (response[field] !== undefined) {
        details[field] = response[field];
      }
    });

    return Object.keys(details).length > 0 ? details : undefined;
  }

  private isValidationError(exception: unknown): boolean {
    return (
      exception instanceof Error &&
      (exception.message.includes('validation failed') ||
       (exception as any).response?.statusCode === 400)
    );
  }

  private isRedisError(exception: unknown): boolean {
    return (
      exception instanceof Error &&
      (exception.name.includes('Redis') ||
       exception.message.includes('redis') ||
       exception.message.includes('Redis'))
    );
  }

  private isJWTError(exception: unknown): boolean {
    return (
      exception instanceof Error &&
      (exception.name.includes('JsonWebToken') ||
       exception.message.includes('jwt') ||
       exception.message.includes('token'))
    );
  }

  private logError(
    exception: unknown,
    context: {
      requestId: string;
      url: string;
      method: string;
      userAgent: string;
      ip: string;
      statusCode: number;
    }
  ): void {
    const errorMessage = exception instanceof Error ? exception.message : 'Unknown error';
    const errorStack = exception instanceof Error ? exception.stack : undefined;

    // Log with appropriate level based on status code
    if (context.statusCode >= 500) {
      this.logger.error(
        `${context.method} ${context.url} - ${errorMessage}`,
        {
          ...context,
          stack: errorStack,
          exception: exception instanceof Error ? exception.name : 'Unknown',
        }
      );
    } else if (context.statusCode >= 400) {
      this.logger.warn(
        `${context.method} ${context.url} - ${errorMessage}`,
        {
          ...context,
          exception: exception instanceof Error ? exception.name : 'Unknown',
        }
      );
    } else {
      this.logger.log(
        `${context.method} ${context.url} - ${errorMessage}`,
        context
      );
    }
  }

  private extractIP(request: FastifyRequest): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || 'unknown';
  }

  private formatStackTrace(exception: unknown): string | undefined {
    if (!(exception instanceof Error) || !exception.stack) {
      return undefined;
    }

    // Filter out sensitive information from stack trace
    return exception.stack
      .split('\n')
      .filter(line => !line.includes('node_modules'))
      .slice(0, 10) // Limit stack trace lines
      .join('\n');
  }

  private sanitizeErrorDetails(details: any): any {
    if (!details || typeof details !== 'object') {
      return details;
    }

    const sanitized = { ...details };

    // SECURITY: Always remove sensitive fields in production
    if (process.env.NODE_ENV === 'production') {
      // Remove ALL potentially sensitive database information
      delete sanitized.query;
      delete sanitized.params;
      delete sanitized.originalMessage;
      delete sanitized.sql;
      delete sanitized.bindings;
      delete sanitized.constraint;
      delete sanitized.table;
      delete sanitized.column;
      delete sanitized.cause;
      
      // Remove internal context that might contain sensitive data
      if (sanitized.context) {
        const sanitizedContext = { ...sanitized.context };
        delete sanitizedContext.query;
        delete sanitizedContext.params;
        delete sanitizedContext.connectionString;
        delete sanitizedContext.apiKey;
        delete sanitizedContext.token;
        delete sanitizedContext.password;
        delete sanitizedContext.secret;
        delete sanitizedContext.key;
        sanitized.context = sanitizedContext;
      }
      
      // Remove Prisma error metadata in production
      if (sanitized.meta) {
        const sanitizedMeta = { ...sanitized.meta };
        delete sanitizedMeta.target;
        delete sanitizedMeta.field_name;
        delete sanitizedMeta.column_name;
        delete sanitizedMeta.constraint;
        delete sanitizedMeta.database_error;
        sanitized.meta = Object.keys(sanitizedMeta).length > 0 ? sanitizedMeta : undefined;
      }
    }

    return sanitized;
  }
}