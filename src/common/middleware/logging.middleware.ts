import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { LoggerUtil } from '../utils/logger.util';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
    use(req: FastifyRequest, res: FastifyReply, next: () => void) {
        const start = Date.now();

        const originalSend = res.send;
        res.send = function (payload: any) {
            const duration = Date.now() - start;
            LoggerUtil.logRequest(req, res, duration);
            return originalSend.call(this, payload);
        };

        next();
    }
}
