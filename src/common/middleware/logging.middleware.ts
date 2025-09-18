import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { LoggerUtil } from '../utils/logger.util';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
    use(req: FastifyRequest, res: FastifyReply, next: () => void) {
        const start = Date.now();
        let requestBody = '';
        let responseBody = '';

        if (req.body && typeof req.body === 'object') {
            try {
                requestBody = JSON.stringify(req.body);
            } catch (error) {
                requestBody = String(req.body);
            }
        }

        const originalSend = res.send;
        res.send = function (payload: any) {
            const duration = Date.now() - start;
            const statusCode = res.statusCode || 200;

            if (payload && typeof payload === 'object') {
                try {
                    responseBody = JSON.stringify(payload);
                } catch (error) {
                    responseBody = String(payload);
                }
            } else {
                responseBody = String(payload || '');
            }

            // Log HTTP request using Winston (will go to both CSV and log files)
            LoggerUtil.logHttpRequest({
                method: req.method,
                url: req.url,
                statusCode,
                duration,
                ip: req.ip || req.socket?.remoteAddress || '',
                userAgent: req.headers['user-agent'],
                userId: (req as any).user?.id || (req as any).user?.uid,
                requestSize: requestBody ? Buffer.byteLength(requestBody, 'utf8') : undefined,
                responseSize: responseBody ? Buffer.byteLength(responseBody, 'utf8') : undefined,
                requestBody: requestBody || undefined,
                responseBody: responseBody || undefined,
                error: statusCode >= 400 ? `HTTP ${statusCode}` : undefined
            });

            return originalSend.call(this, payload);
        };

        next();
    }
}
