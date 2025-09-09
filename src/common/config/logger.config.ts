import * as winston from 'winston';
import 'winston-daily-rotate-file';

export const loggerConfig = {
    enabled: process.env.LOG_ENABLE === 'TRUE',
    level: process.env.LOGGER_LEVEL || 'INFO',
    maxString: parseInt(process.env.MAX_STRING || '300'),
};

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
);

const dailyRotateTransport = new winston.transports.DailyRotateFile({
    filename: 'logs/File_%DD%MM%YY.log',
    datePattern: 'DD-MM-YY',
    maxSize: '20m',
    maxFiles: '14d',
    format: logFormat,
});

export const logger = winston.createLogger({
    level: loggerConfig.level.toLowerCase(),
    format: logFormat,
    transports: [
        dailyRotateTransport,
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
            ),
        }),
    ],
});

if (loggerConfig.enabled) {
    logger.info('Logger initialized', {
        level: loggerConfig.level,
        maxString: loggerConfig.maxString
    });
}
