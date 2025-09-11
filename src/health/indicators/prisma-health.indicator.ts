import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { PrimaryDatabaseService } from '../../database/services/primary-database.service';
import { LogsDatabaseService } from '../../database/services/logs-database.service';
import { AddressDatabaseService } from '../../database/services/address-database.service';

interface DatabaseStatus {
  name: string;
  status: 'up' | 'down';
  latency?: string;
  connection: 'established' | 'failed';
  recordCount?: number;
  error?: string;
}

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(
    private readonly primaryDb: PrimaryDatabaseService,
    private readonly logsDb: LogsDatabaseService,
    private readonly addressDb: AddressDatabaseService,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Test basic database connectivity with primary database
      const startTime = Date.now();
      
      // Simple query to test connection - using the users table as it should exist
      const result = await this.primaryDb.users.count();
      
      const latency = Date.now() - startTime;
      
      const status = {
        status: 'up',
        latency: `${latency}ms`,
        connection: 'established',
        recordCount: result,
        database: 'prisma_primary',
      };

      return this.getStatus(key, true, status);
    } catch (error) {
      const status = {
        status: 'down',
        connection: 'failed',
        error: error.message,
        database: 'prisma_primary',
      };

      return this.getStatus(key, false, status);
    }
  }

  async checkMultipleDatabases(): Promise<HealthIndicatorResult> {
    try {
      const databases: DatabaseStatus[] = [];
      let overallHealthy = true;

      // Check primary database
      try {
        const startTime = Date.now();
        const userCount = await this.primaryDb.users.count();
        const latency = Date.now() - startTime;

        databases.push({
          name: 'primary',
          status: 'up',
          latency: `${latency}ms`,
          connection: 'established',
          recordCount: userCount,
        });
      } catch (error) {
        overallHealthy = false;
        databases.push({
          name: 'primary',
          status: 'down',
          connection: 'failed',
          error: error.message,
        });
      }

      // Check logs database
      try {
        const startTime = Date.now();
        // Use $queryRaw for a simple connection test since we don't know the schema
        await this.logsDb.$queryRaw`SELECT 1`;
        const latency = Date.now() - startTime;

        databases.push({
          name: 'logs',
          status: 'up',
          latency: `${latency}ms`,
          connection: 'established',
        });
      } catch (error) {
        overallHealthy = false;
        databases.push({
          name: 'logs',
          status: 'down',
          connection: 'failed',
          error: error.message,
        });
      }

      // Check address database
      try {
        const startTime = Date.now();
        await this.addressDb.$queryRaw`SELECT 1`;
        const latency = Date.now() - startTime;

        databases.push({
          name: 'address',
          status: 'up',
          latency: `${latency}ms`,
          connection: 'established',
        });
      } catch (error) {
        overallHealthy = false;
        databases.push({
          name: 'address',
          status: 'down',
          connection: 'failed',
          error: error.message,
        });
      }

      const status = {
        databases,
        overallStatus: overallHealthy ? 'healthy' : 'unhealthy',
        totalDatabases: databases.length,
        healthyDatabases: databases.filter(db => db.status === 'up').length,
      };

      return this.getStatus('database', overallHealthy, status);
    } catch (error) {
      const status = {
        status: 'down',
        error: error.message,
        message: 'Database health check failed',
      };

      return this.getStatus('database', false, status);
    }
  }
}