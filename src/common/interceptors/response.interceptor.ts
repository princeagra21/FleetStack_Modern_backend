import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { LoggerUtil } from '../utils/logger.util';

export interface Response<T> {
    status: string;
    data: T;
    message?: string;
    timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
        return next.handle().pipe(
            map((data) => {
                const response = {
                    status: 'success',
                    data,
                    timestamp: new Date().toISOString(),
                };

                LoggerUtil.logResponse(data);
                return response;
            }),
        );
    }
}
