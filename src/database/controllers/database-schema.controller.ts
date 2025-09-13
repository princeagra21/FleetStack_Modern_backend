import { Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabaseSchemaSyncService } from '../services/database-schema-sync.service';
import { PrismaClientEnsureService } from '../services/prisma-client-ensure.service';

@ApiTags('Database Schema')
@Controller('database/schema')
export class DatabaseSchemaController {
  constructor(
    private readonly schemaSyncService: DatabaseSchemaSyncService,
    private readonly prismaClientEnsureService: PrismaClientEnsureService,
  ) {}

  @Get('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Check database schema status',
    description: 'Returns the status of all database schemas, including missing tables' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Schema status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        primary: {
          type: 'object',
          properties: {
            missing: { type: 'array', items: { type: 'string' } },
            status: { type: 'string', enum: ['up-to-date', 'missing-tables', 'connection-error'] }
          }
        },
        logs: {
          type: 'object',
          properties: {
            missing: { type: 'array', items: { type: 'string' } },
            status: { type: 'string', enum: ['up-to-date', 'missing-tables', 'connection-error'] }
          }
        },
        address: {
          type: 'object',
          properties: {
            missing: { type: 'array', items: { type: 'string' } },
            status: { type: 'string', enum: ['up-to-date', 'missing-tables', 'connection-error'] }
          }
        }
      }
    }
  })
  async getSchemaStatus() {
    return await this.schemaSyncService.checkDatabaseStatus();
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Manually trigger schema synchronization',
    description: 'Manually triggers database schema synchronization for all databases' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Schema synchronization completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Schema synchronization failed' 
  })
  async syncSchema() {
    return await this.schemaSyncService.manualSync();
  }

  @Post('create-databases')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Create databases if they don\'t exist',
    description: 'Manually triggers database creation for all configured databases' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Database creation completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Database creation failed' 
  })
  async createDatabases() {
    return await this.schemaSyncService.manualCreateDatabases();
  }

  @Get('prisma-clients/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Check Prisma clients status',
    description: 'Returns the status of all Prisma clients, including missing or outdated clients' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Prisma client status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        allClientsPresent: { type: 'boolean' },
        upToDate: { type: 'boolean' },
        missingClients: { type: 'array', items: { type: 'string' } },
        outdatedSchemas: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  async getPrismaClientStatus() {
    return await this.prismaClientEnsureService.getClientStatus();
  }

  @Post('prisma-clients/regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Regenerate Prisma clients',
    description: 'Manually triggers regeneration of all Prisma clients' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Prisma clients regenerated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Prisma client regeneration failed' 
  })
  async regeneratePrismaClients() {
    try {
      await this.prismaClientEnsureService.regenerateClients();
      return {
        success: true,
        message: 'Prisma clients regenerated successfully'
      };
    } catch (error) {
      throw error;
    }
  }
}
