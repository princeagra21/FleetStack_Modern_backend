import { winstonLogger, winstonConfig } from '../config/winston.config';

export class LoggerUtil {
    static info(message: string, meta?: any, context?: string) {
        if (winstonConfig.enabled) {
            const formattedMessage = context ? `[${context}] ${message}` : message;
            winstonLogger.info(formattedMessage, meta);
        }
    }

    static warn(message: string, meta?: any, context?: string) {
        if (winstonConfig.enabled) {
            const formattedMessage = context ? `[${context}] ${message}` : message;
            winstonLogger.warn(formattedMessage, meta);
        }
    }

    static error(message: string, meta?: any, context?: string) {
        if (winstonConfig.enabled) {
            const formattedMessage = context ? `[${context}] ${message}` : message;
            winstonLogger.error(formattedMessage, meta);
        }
    }

    static debug(message: string, meta?: any, context?: string) {
        if (winstonConfig.enabled) {
            const formattedMessage = context ? `[${context}] ${message}` : message;
            winstonLogger.debug(formattedMessage, meta);
        }
    }

    static verbose(message: string, meta?: any, context?: string) {
        if (winstonConfig.enabled) {
            const formattedMessage = context ? `[${context}] ${message}` : message;
            winstonLogger.verbose(formattedMessage, meta);
        }
    }

    static truncateString(str: string, maxLength: number = winstonConfig.maxString): string {
        if (!str || typeof str !== 'string') return str;

        if (str.length <= maxLength) {
            return str;
        }

        return str.substring(0, maxLength) + '...';
    }

    static logRequest(req: any, res: any, duration: number) {
        if (!winstonConfig.enabled) return;

        const { method, url, ip } = req;
        const statusCode = res.statusCode || res.raw?.statusCode || 200;

        const logData = {
            type: 'http_request',
            method,
            url,
            statusCode,
            duration,
            ip,
            userAgent: this.truncateString(req.headers['user-agent']),
            userId: req.user?.id || req.user?.uid,
            timestamp: new Date().toISOString(),
        };

        if (statusCode >= 500) {
            this.error(`HTTP ${statusCode} ${method} ${url}`, logData, 'HTTP');
        } else if (statusCode >= 400) {
            this.warn(`HTTP ${statusCode} ${method} ${url}`, logData, 'HTTP');
        } else {
            this.info(`HTTP ${statusCode} ${method} ${url}`, logData, 'HTTP');
        }
    }

    static logHttpRequest(data: {
        method: string;
        url: string;
        statusCode: number;
        duration: number;
        ip: string;
        userAgent?: string;
        userId?: string;
        requestSize?: number;
        responseSize?: number;
        requestBody?: string;
        responseBody?: string;
        error?: string;
    }) {
        if (!winstonConfig.enabled) return;

        const logData = {
            type: 'http_request',
            method: data.method,
            url: data.url,
            statusCode: data.statusCode,
            duration: data.duration,
            ip: data.ip,
            userAgent: this.truncateString(data.userAgent || ''),
            userId: data.userId,
            requestSize: data.requestSize,
            responseSize: data.responseSize,
            requestBody: this.truncateString(data.requestBody || '', 1000),
            responseBody: this.truncateString(data.responseBody || '', 1000),
            error: data.error,
            context: 'HTTP',
            timestamp: new Date().toISOString(),
        };

        const message = `HTTP ${data.statusCode} ${data.method} ${data.url} (${data.duration}ms)`;

        if (data.statusCode >= 500) {
            this.error(message, logData, 'HTTP');
        } else if (data.statusCode >= 400) {
            this.warn(message, logData, 'HTTP');
        } else {
            this.info(message, logData, 'HTTP');
        }
    }

    static logResponse(data: any) {
        if (winstonConfig.enabled) {
            const truncatedData = this.truncateString(JSON.stringify(data));
            this.debug('Response data', {
                type: 'http_response',
                data: truncatedData
            }, 'HTTP');
        }
    }

    static logSystemEvent(event: string, details?: any) {
        this.info(`System event: ${event}`, {
            type: 'system_event',
            event,
            details,
            timestamp: new Date().toISOString(),
        }, 'SYSTEM');
    }

    static logBusinessEvent(event: string, userId?: string, details?: any) {
        this.info(`Business event: ${event}`, {
            type: 'business_event',
            event,
            userId,
            details,
            timestamp: new Date().toISOString(),
        }, 'BUSINESS');
    }

    static logSecurityEvent(event: string, ip?: string, userId?: string, details?: any) {
        this.warn(`Security event: ${event}`, {
            type: 'security_event',
            event,
            ip,
            userId,
            details,
            timestamp: new Date().toISOString(),
        }, 'SECURITY');
    }

    static logPerformance(operation: string, duration: number, details?: any) {
        const level = duration > 1000 ? 'warn' : 'info';
        this[level](`Performance: ${operation} took ${duration}ms`, {
            type: 'performance',
            operation,
            duration,
            details,
            timestamp: new Date().toISOString(),
        }, 'PERFORMANCE');
    }

    static logDatabaseQuery(query: string, duration: number) {
        this.debug('Database query executed', {
            type: 'database_query',
            query: this.truncateString(query),
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
        }, 'DATABASE');
    }
}
