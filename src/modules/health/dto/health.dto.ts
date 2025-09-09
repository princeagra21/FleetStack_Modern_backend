import { ApiProperty } from '@nestjs/swagger';

export class HealthDto {
    @ApiProperty({ description: 'Application status' })
    status: string;

    @ApiProperty({ description: 'Current timestamp' })
    timestamp: string;

    @ApiProperty({ description: 'Application uptime in seconds' })
    uptime: number;

    @ApiProperty({
        description: 'Database connection status',
        type: 'object',
        properties: {
            primary: { type: 'boolean' },
            logs: { type: 'boolean' },
            address: { type: 'boolean' }
        }
    })
    database: {
        primary: boolean;
        logs: boolean;
        address: boolean;
    };
}