import { Injectable } from '@nestjs/common';
import { LoggerUtil } from '../utils/logger.util';

@Injectable()
export class LoggerService {
    info(message: string, meta?: any) {
        LoggerUtil.info(message, meta);
    }

    warn(message: string, meta?: any) {
        LoggerUtil.warn(message, meta);
    }

    error(message: string, meta?: any) {
        LoggerUtil.error(message, meta);
    }

    debug(message: string, meta?: any) {
        LoggerUtil.debug(message, meta);
    }

    logRequest(req: any, res: any, duration: number) {
        LoggerUtil.logRequest(req, res, duration);
    }

    logResponse(data: any) {
        LoggerUtil.logResponse(data);
    }
}

