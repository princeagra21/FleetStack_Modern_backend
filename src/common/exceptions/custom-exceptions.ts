import { HttpException, HttpStatus } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';

/**
 * Custom Exception Classes for FleetStack Application
 * 
 * These custom exceptions provide standardized error handling
 * with consistent error messages and status codes across the application.
 * Each exception includes detailed context and proper HTTP status codes.
 */

/**
 * Business Logic Exception
 * Used for domain-specific business rule violations
 */
export class BusinessLogicException extends HttpException {
  constructor(
    message: string, 
    errorCode?: string, 
    context?: Record<string, any>,
    i18nKey?: string,
    i18nArgs?: Record<string, any>
  ) {
    const i18n = I18nContext.current();
    let translatedMessage = message;
    let translatedError = 'Business Logic Error';

    if (i18n && i18nKey) {
      try {
        translatedMessage = i18n.t(i18nKey, { args: i18nArgs }) || message;
        translatedError = i18n.t('errors.business_logic.title') || 'Business Logic Error';
      } catch (error) {
        // Fallback to original message if translation fails
      }
    }

    super(
      {
        error: translatedError,
        message: translatedMessage,
        errorCode,
        context,
        i18nKey,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.UNPROCESSABLE_ENTITY
    );
  }
}

/**
 * Resource Not Found Exception
 * Enhanced version of NotFoundException with more context
 */
export class ResourceNotFoundException extends HttpException {
  constructor(
    resourceType: string,
    identifier: string | number,
    context?: Record<string, any>,
    i18nKey?: string
  ) {
    const i18n = I18nContext.current();
    let translatedMessage = `${resourceType} with identifier '${identifier}' was not found`;

    if (i18n) {
      try {
        translatedMessage = i18n.t(i18nKey || 'errors.resource.not_found', { 
          args: { resourceType, identifier } 
        }) || translatedMessage;
      } catch (error) {
        // Fallback to original message if translation fails
      }
    }

    super(
      {
        error: 'Resource Not Found',
        message: translatedMessage,
        resourceType,
        identifier,
        context,
        i18nKey: i18nKey || 'errors.resource.not_found',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.NOT_FOUND
    );
  }
}

/**
 * Resource Conflict Exception
 * Used when a resource already exists or conflicts with existing data
 */
export class ResourceConflictException extends HttpException {
  constructor(
    resourceType: string,
    conflictField: string,
    conflictValue: any,
    context?: Record<string, any>
  ) {
    super(
      {
        error: 'Resource Conflict',
        message: `${resourceType} with ${conflictField} '${conflictValue}' already exists`,
        resourceType,
        conflictField,
        conflictValue,
        context,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.CONFLICT
    );
  }
}

/**
 * Validation Exception
 * Used for custom validation errors beyond standard DTO validation
 */
export class ValidationException extends HttpException {
  constructor(
    field: string,
    value: any,
    expectedFormat: string,
    context?: Record<string, any>,
    i18nKey?: string
  ) {
    const i18n = I18nContext.current();
    let translatedMessage = `Invalid value for field '${field}'. Expected: ${expectedFormat}`;

    if (i18n && i18nKey) {
      try {
        translatedMessage = i18n.t(i18nKey, { 
          args: { field, value, expectedFormat } 
        }) || translatedMessage;
      } catch (error) {
        // Fallback to original message if translation fails
      }
    }

    super(
      {
        error: 'Validation Error',
        message: translatedMessage,
        field,
        value,
        expectedFormat,
        context,
        i18nKey,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.BAD_REQUEST
    );
  }
}

/**
 * Service Unavailable Exception
 * Used when external services or dependencies are unavailable
 */
export class ServiceUnavailableException extends HttpException {
  constructor(
    serviceName: string,
    reason: string,
    retryAfter?: number,
    context?: Record<string, any>,
    i18nKey?: string
  ) {
    const i18n = I18nContext.current();
    let translatedMessage = `${serviceName} is currently unavailable: ${reason}`;

    if (i18n) {
      try {
        translatedMessage = i18n.t(i18nKey || 'errors.service.unavailable', { 
          args: { serviceName, reason } 
        }) || translatedMessage;
      } catch (error) {
        // Fallback to original message if translation fails
      }
    }

    super(
      {
        error: 'Service Unavailable',
        message: translatedMessage,
        serviceName,
        reason,
        retryAfter,
        context,
        i18nKey: i18nKey || 'errors.service.unavailable',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.SERVICE_UNAVAILABLE
    );
  }
}

/**
 * Rate Limit Exception
 * Used when API rate limits are exceeded
 */
export class RateLimitException extends HttpException {
  constructor(
    limit: number,
    windowMs: number,
    retryAfter: number,
    context?: Record<string, any>
  ) {
    super(
      {
        error: 'Rate Limit Exceeded',
        message: `Too many requests. Limit: ${limit} requests per ${windowMs}ms`,
        limit,
        windowMs,
        retryAfter,
        resetTime: new Date(Date.now() + retryAfter * 1000).toISOString(),
        context,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
}

/**
 * Database Operation Exception
 * Used for database-specific errors
 */
export class DatabaseOperationException extends HttpException {
  constructor(
    operation: string,
    tableName: string,
    reason: string,
    context?: Record<string, any>
  ) {
    super(
      {
        error: 'Database Operation Failed',
        message: `Failed to ${operation} on ${tableName}: ${reason}`,
        operation,
        tableName,
        reason,
        context,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * Cache Operation Exception
 * Used for cache-specific errors
 */
export class CacheOperationException extends HttpException {
  constructor(
    operation: string,
    key: string,
    reason: string,
    context?: Record<string, any>
  ) {
    super(
      {
        error: 'Cache Operation Failed',
        message: `Failed to ${operation} cache key '${key}': ${reason}`,
        operation,
        key,
        reason,
        context,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * Permission Denied Exception
 * Enhanced version of ForbiddenException with more context
 */
export class PermissionDeniedException extends HttpException {
  constructor(
    action: string,
    resource: string,
    userRole: string,
    requiredRoles: string[],
    context?: Record<string, any>
  ) {
    super(
      {
        error: 'Permission Denied',
        message: `User with role '${userRole}' cannot ${action} ${resource}`,
        action,
        resource,
        userRole,
        requiredRoles,
        context,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.FORBIDDEN
    );
  }
}

/**
 * External API Exception
 * Used when external API calls fail
 */
export class ExternalApiException extends HttpException {
  constructor(
    apiName: string,
    endpoint: string,
    statusCode: number,
    errorMessage: string,
    context?: Record<string, any>
  ) {
    super(
      {
        error: 'External API Error',
        message: `${apiName} API error at ${endpoint}: ${errorMessage}`,
        apiName,
        endpoint,
        externalStatusCode: statusCode,
        errorMessage,
        context,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.BAD_GATEWAY
    );
  }
}