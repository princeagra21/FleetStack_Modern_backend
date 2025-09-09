import { logger, loggerConfig } from '../config/logger.config';

export class LoggerUtil {
    static info(message: string, meta?: any) {
        if (loggerConfig.enabled) {
            logger.info(message, meta);
        }
    }

    static warn(message: string, meta?: any) {
        if (loggerConfig.enabled) {
            logger.warn(message, meta);
        }
    }

    static error(message: string, meta?: any) {
        if (loggerConfig.enabled) {
            logger.error(message, meta);
        }
    }

    static debug(message: string, meta?: any) {
        if (loggerConfig.enabled) {
            logger.debug(message, meta);
        }
    }

    static truncateString(str: string): string {
        if (str && str.length > loggerConfig.maxString) {
            return str.substring(0, loggerConfig.maxString) + '...';
        }
        return str;
    }

    static logRequest(req: any, res: any, duration: number) {
        if (loggerConfig.enabled) {
            const { method, url, ip } = req;
            const statusCode = res.statusCode || res.raw?.statusCode || 200;

            const logData = {
                method,
                url,
                statusCode,
                duration: `${duration}ms`,
                ip,
                userAgent: req.headers['user-agent'],
                timestamp: new Date().toISOString(),
            };

            if (statusCode >= 400) {
                this.error(`${method} ${url} ${statusCode}`, logData);
            } else {
                this.info(`${method} ${url} ${statusCode}`, logData);
            }
        }
    }

    static logResponse(data: any) {
        if (loggerConfig.enabled) {
            const truncatedData = this.truncateString(JSON.stringify(data));
            this.debug('Response data', { data: truncatedData });
        }
    }
}

