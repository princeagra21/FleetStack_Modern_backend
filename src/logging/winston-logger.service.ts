import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file'; // Side effect import - extends winston.transports
import { ConfigService } from '../config/config.service';

@Injectable()
export class WinstonLoggerService {
  private logger: winston.Logger;

  constructor(private configService: ConfigService) {
    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const loggingConfig = this.configService.logging;

    // Create winston logger with configuration
    const logger = winston.createLogger({
      level: loggingConfig.level.toLowerCase(),
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `[${timestamp}] ${level.toUpperCase()}: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          }`;
        })
      ),
      transports: [],
    });

    // Add console transport for development
    if (this.configService.nodeEnv === 'development') {
      logger.add(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        })
      );
    }

    // Add daily rotate file transport if logging is enabled
    if (loggingConfig.enabled) {
      logger.add(
        new winston.transports.DailyRotateFile({
          dirname: './Logs',
          filename: 'File_%DATE%.log',
          datePattern: 'DDMMYY',
          zippedArchive: false,
          maxSize: '20m',
          maxFiles: '30d',
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              return `[${timestamp}] ${level.toUpperCase()}: ${message} ${
                Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
              }`;
            })
          ),
        })
      );
    }

    return logger;
  }

  // Logging methods
  debug(message: string, meta?: any): void {
    if (this.configService.logging.enabled) {
      this.logger.debug(message, meta);
    }
  }

  info(message: string, meta?: any): void {
    if (this.configService.logging.enabled) {
      this.logger.info(message, meta);
    }
  }

  warn(message: string, meta?: any): void {
    if (this.configService.logging.enabled) {
      this.logger.warn(message, meta);
    }
  }

  error(message: string, meta?: any): void {
    if (this.configService.logging.enabled) {
      this.logger.error(message, meta);
    }
  }

  // Special method for response logging with string truncation
  logResponse(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    response?: any,
    requestId?: string
  ): void {
    if (this.configService.logging.enabled) {
      const loggingConfig = this.configService.logging;
      
      let responseBody = '';
      if (response && typeof response === 'object') {
        // Handle BigInt serialization
        responseBody = JSON.stringify(response, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        );
      } else if (response) {
        responseBody = String(response);
      }

      // Truncate response string according to MAX_RESP_LOG_STRING
      if (responseBody.length > loggingConfig.maxResponseLogString) {
        responseBody = responseBody.substring(0, loggingConfig.maxResponseLogString) + '...';
      }

      this.logger.info('HTTP Response', {
        requestId,
        method,
        url,
        statusCode,
        responseTime: `${responseTime}ms`,
        response: responseBody,
      });
    }
  }

  // Method for request logging
  logRequest(method: string, url: string, body?: any, headers?: any, requestId?: string): void {
    if (this.configService.logging.enabled) {
      this.logger.info('HTTP Request', {
        requestId,
        method,
        url,
        body: body ? JSON.stringify(body) : undefined,
        userAgent: headers?.['user-agent'],
        ip: headers?.['x-forwarded-for'] || headers?.['x-real-ip'],
      });
    }
  }
}