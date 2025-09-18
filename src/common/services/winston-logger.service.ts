import { Injectable, LoggerService } from '@nestjs/common';
import { winstonLogger, winstonConfig } from '../config/winston.config';

@Injectable()
export class WinstonLoggerService implements LoggerService {
  
  log(message: string, context?: string, meta?: any) {
    this.info(message, context, meta);
  }

  info(message: string, context?: string, meta?: any) {
    if (winstonConfig.enabled) {
      winstonLogger.info(this.formatMessage(message, context), this.formatMeta(meta));
    }
  }

  error(message: string, trace?: string, context?: string, meta?: any) {
    if (winstonConfig.enabled) {
      winstonLogger.error(this.formatMessage(message, context), {
        trace,
        ...this.formatMeta(meta)
      });
    }
  }

  warn(message: string, context?: string, meta?: any) {
    if (winstonConfig.enabled) {
      winstonLogger.warn(this.formatMessage(message, context), this.formatMeta(meta));
    }
  }

  debug(message: string, context?: string, meta?: any) {
    if (winstonConfig.enabled) {
      winstonLogger.debug(this.formatMessage(message, context), this.formatMeta(meta));
    }
  }

  verbose(message: string, context?: string, meta?: any) {
    if (winstonConfig.enabled) {
      winstonLogger.verbose(this.formatMessage(message, context), this.formatMeta(meta));
    }
  }

  logRequest(req: any, res: any, duration: number) {
    if (!winstonConfig.enabled) return;

    const { method, url, ip } = req;
    const statusCode = res.statusCode || res.raw?.statusCode || 200;
    const userAgent = req.headers['user-agent'];
    const userId = req.user?.id || req.user?.uid;

    const logData = {
      type: 'http_request',
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      ip,
      userAgent: this.truncateString(userAgent),
      userId,
      requestId: req.id,
      timestamp: new Date().toISOString(),
    };

    if (statusCode >= 500) {
      this.error(`HTTP ${statusCode} ${method} ${url}`, undefined, 'HTTP', logData);
    } else if (statusCode >= 400) {
      this.warn(`HTTP ${statusCode} ${method} ${url}`, 'HTTP', logData);
    } else {
      this.info(`HTTP ${statusCode} ${method} ${url}`, 'HTTP', logData);
    }
  }

  logResponse(data: any, context?: string) {
    if (winstonConfig.enabled) {
      const responseData = this.truncateString(JSON.stringify(data));
      this.debug('Response data', context || 'HTTP', { 
        type: 'http_response',
        data: responseData 
      });
    }
  }

  logDatabaseQuery(query: string, duration: number, context?: string) {
    if (winstonConfig.enabled) {
      this.debug('Database query executed', context || 'DATABASE', {
        type: 'database_query',
        query: this.truncateString(query),
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  logSystemEvent(event: string, details?: any, context?: string) {
    if (winstonConfig.enabled) {
      this.info(`System event: ${event}`, context || 'SYSTEM', {
        type: 'system_event',
        event,
        details,
        timestamp: new Date().toISOString(),
      });
    }
  }

  logBusinessEvent(event: string, userId?: string, details?: any, context?: string) {
    if (winstonConfig.enabled) {
      this.info(`Business event: ${event}`, context || 'BUSINESS', {
        type: 'business_event',
        event,
        userId,
        details,
        timestamp: new Date().toISOString(),
      });
    }
  }

  logSecurityEvent(event: string, ip?: string, userId?: string, details?: any) {
    if (winstonConfig.enabled) {
      this.warn(`Security event: ${event}`, 'SECURITY', {
        type: 'security_event',
        event,
        ip,
        userId,
        details,
        timestamp: new Date().toISOString(),
      });
    }
  }

  logPerformance(operation: string, duration: number, details?: any, context?: string) {
    if (winstonConfig.enabled) {
      const level = duration > 1000 ? 'warn' : 'info';
      this[level](`Performance: ${operation} took ${duration}ms`, context || 'PERFORMANCE', {
        type: 'performance',
        operation,
        duration,
        details,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private formatMessage(message: string, context?: string): string {
    return context ? `[${context}] ${message}` : message;
  }

  private formatMeta(meta?: any): any {
    if (!meta) return {};
    
    if (typeof meta === 'string') {
      return { message: this.truncateString(meta) };
    }
    
    if (typeof meta === 'object') {
      const formatted: any = {};
      Object.keys(meta).forEach(key => {
        const value = meta[key];
        if (typeof value === 'string') {
          formatted[key] = this.truncateString(value);
        } else {
          formatted[key] = value;
        }
      });
      return formatted;
    }
    
    return { data: meta };
  }

  private truncateString(str: string, maxLength: number = winstonConfig.maxString): string {
    if (!str || typeof str !== 'string') return str;
    
    if (str.length <= maxLength) {
      return str;
    }
    
    return str.substring(0, maxLength) + '...';
  }
}
