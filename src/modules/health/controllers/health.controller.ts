import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from '../services/health.service';
import { HealthDto } from '../dto/health.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
    constructor(private readonly healthService: HealthService) { }

    @Get()
    @ApiOperation({ summary: 'Get application health status' })
    @ApiResponse({
        status: 200,
        description: 'Health status retrieved successfully',
        type: HealthDto
    })
    async getHealth(): Promise<HealthDto> {
        return this.healthService.getHealth();
    }
}