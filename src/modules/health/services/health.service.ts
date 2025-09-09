import { Injectable } from '@nestjs/common';
import { HealthDto } from '../dto/health.dto';

@Injectable()
export class HealthService {
    async getHealth(): Promise<HealthDto> {
        const startTime = process.uptime();

        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(startTime),
            database: {
                primary: await this.checkDatabase('primary'),
                logs: await this.checkDatabase('logs'),
                address: await this.checkDatabase('address'),
            },
        };
    }

    private async checkDatabase(dbName: string): Promise<boolean> {
        try {
            return true;
        } catch (error) {
            return false;
        }
    }
}

