import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as path from 'path';
import { CsvTransport } from '../transports/winston-csv.transport';

export interface LoggerConfig {
    enabled: boolean;
    level: string;
    maxString: number;
    logDir: string;
    csvDir: string;
    maxSize: string;
    maxFiles: string;
    datePattern: string;
}

export const winstonConfig: LoggerConfig = {
    enabled: process.env.WINSTON_LOGGING_ENABLED !== 'false',
    level: process.env.LOG_LEVEL || 'info',
    maxString: parseInt(process.env.MAX_LOG_STRING || '1000', 10),
    logDir: process.env.WINSTON_LOG_DIR || 'winston_logs',
    csvDir: process.env.CSV_LOG_DIR || 'api_logs',
    maxSize: process.env.WINSTON_MAX_SIZE || '20m',
    maxFiles: process.env.WINSTON_MAX_FILES || '30d',
    datePattern: process.env.WINSTON_DATE_PATTERN || 'YYYY-MM-DD',
};

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}] ${message} ${metaStr}`;
    })
);

const createFileTransport = (filename: string, level?: string) => {
    return new winston.transports.DailyRotateFile({
        filename: path.join(winstonConfig.logDir, filename),
        datePattern: winstonConfig.datePattern,
        maxSize: winstonConfig.maxSize,
        maxFiles: winstonConfig.maxFiles,
        format: logFormat,
        level: level,
    });
};

const transports: winston.transport[] = [
    new winston.transports.Console({
        format: consoleFormat,
        level: winstonConfig.level,
    }),
];

if (winstonConfig.enabled) {
    // Add CSV transport for HTTP requests
    transports.push(new CsvTransport({
        csvDir: winstonConfig.csvDir,
    }));

    // Add regular file transports for application logs
    transports.push(
        createFileTransport('application-%DATE%.log'),
        createFileTransport('error-%DATE%.log', 'error')
    );
}

export const winstonLogger = winston.createLogger({
    level: winstonConfig.level,
    format: logFormat,
    transports,
    exceptionHandlers: winstonConfig.enabled ? [
        createFileTransport('exceptions-%DATE%.log')
    ] : [],
    rejectionHandlers: winstonConfig.enabled ? [
        createFileTransport('rejections-%DATE%.log')
    ] : [],
});

export default winstonLogger;
