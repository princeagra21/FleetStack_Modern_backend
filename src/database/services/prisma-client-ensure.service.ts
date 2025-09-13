import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PrismaClientEnsureService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PrismaClientEnsureService.name);

  private readonly clients = [
    'node_modules/@prisma/primary',
    'node_modules/@prisma/address', 
    'node_modules/@prisma/logs'
  ];

  private readonly schemas = [
    'src/database/prisma/primary.prisma',
    'src/database/prisma/address.prisma',
    'src/database/prisma/logs.prisma'
  ];

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('🔍 Checking Prisma client status...');
    await this.checkAndGenerateClients();
  }

  private async checkAndGenerateClients(): Promise<void> {
    let needsGeneration = false;
    
    // Check if any client is missing
    for (const clientPath of this.clients) {
      if (!fs.existsSync(clientPath)) {
        this.logger.log(`🔄 Missing Prisma client: ${clientPath}`);
        needsGeneration = true;
        break;
      }
    }
    
    // Check if any schema is newer than the client
    if (!needsGeneration) {
      for (let i = 0; i < this.schemas.length; i++) {
        const schemaPath = this.schemas[i];
        const clientPath = this.clients[i];
        
        if (fs.existsSync(schemaPath) && fs.existsSync(clientPath)) {
          const schemaStats = fs.statSync(schemaPath);
          const clientIndexPath = path.join(clientPath, 'index.js');
          
          if (fs.existsSync(clientIndexPath)) {
            const clientStats = fs.statSync(clientIndexPath);
            
            if (schemaStats.mtime > clientStats.mtime) {
              this.logger.log(`🔄 Schema ${schemaPath} is newer than client`);
              needsGeneration = true;
              break;
            }
          } else {
            this.logger.log(`🔄 Missing client index file: ${clientIndexPath}`);
            needsGeneration = true;
            break;
          }
        }
      }
    }
    
    if (needsGeneration) {
      this.logger.log('🚀 Generating Prisma clients...');
      try {
        execSync('npm run prisma:generate:all', { stdio: 'inherit' });
        this.logger.log('✅ All Prisma clients generated successfully');
      } catch (error) {
        this.logger.error('❌ Failed to generate Prisma clients:', error.message);
        throw new Error(`Prisma client generation failed: ${error.message}`);
      }
    } else {
      this.logger.log('✅ All Prisma clients are up to date');
    }
  }

  /**
   * Manually trigger Prisma client generation
   * This can be useful for development or admin endpoints
   */
  async regenerateClients(): Promise<void> {
    this.logger.log('🔄 Manually triggering Prisma client generation...');
    try {
      execSync('npm run prisma:generate:all', { stdio: 'inherit' });
      this.logger.log('✅ Manual Prisma client generation completed');
    } catch (error) {
      this.logger.error('❌ Manual Prisma client generation failed:', error.message);
      throw new Error(`Manual Prisma client generation failed: ${error.message}`);
    }
  }

  /**
   * Check if all Prisma clients are available and up-to-date
   */
  async getClientStatus(): Promise<{
    allClientsPresent: boolean;
    upToDate: boolean;
    missingClients: string[];
    outdatedSchemas: string[];
  }> {
    const missingClients: string[] = [];
    const outdatedSchemas: string[] = [];
    
    // Check for missing clients
    for (const clientPath of this.clients) {
      if (!fs.existsSync(clientPath)) {
        missingClients.push(clientPath);
      }
    }
    
    // Check for outdated schemas
    for (let i = 0; i < this.schemas.length; i++) {
      const schemaPath = this.schemas[i];
      const clientPath = this.clients[i];
      
      if (fs.existsSync(schemaPath) && fs.existsSync(clientPath)) {
        const schemaStats = fs.statSync(schemaPath);
        const clientIndexPath = path.join(clientPath, 'index.js');
        
        if (fs.existsSync(clientIndexPath)) {
          const clientStats = fs.statSync(clientIndexPath);
          
          if (schemaStats.mtime > clientStats.mtime) {
            outdatedSchemas.push(schemaPath);
          }
        } else {
          missingClients.push(clientPath);
        }
      }
    }
    
    return {
      allClientsPresent: missingClients.length === 0,
      upToDate: outdatedSchemas.length === 0,
      missingClients,
      outdatedSchemas
    };
  }
}
