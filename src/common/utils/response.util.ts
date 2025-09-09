import { Status } from '../enums/status.enum';

export class ResponseUtil {
    static success<T>(data: T, message?: string) {
        return {
            status: Status.SUCCESS,
            data,
            message,
            timestamp: new Date().toISOString(),
        };
    }

    static error(message: string, statusCode = 400) {
        return {
            status: Status.ERROR,
            message,
            statusCode,
            timestamp: new Date().toISOString(),
        };
    }
}

