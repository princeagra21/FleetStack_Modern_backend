import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Client } from 'pg';
import { PrimaryDatabaseService } from './primary-database.service';
import { LogsDatabaseService } from './logs-database.service';
import { AddressDatabaseService } from './address-database.service';
import { ConfigService } from '../../config/config.service';

const execAsync = promisify(exec);

interface SchemaInfo {
  name: string;
  expectedTables: string[];
  schemaPath: string;
  service: any;
  migrateCommand: string;
  databaseUrl: string;
  databaseName: string;
}

@Injectable()
export class DatabaseSchemaSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSchemaSyncService.name);

  constructor(
    private readonly primaryDb: PrimaryDatabaseService,
    private readonly logsDb: LogsDatabaseService,
    private readonly addressDb: AddressDatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    // Schema synchronization is now handled by DatabaseEarlyInitService
    // This method is kept for backward compatibility and manual operations
    this.logger.log('🚀 DatabaseSchemaSyncService ready for manual operations');
    
    // Only run full sync if early init didn't run (fallback)
    // This can happen in some edge cases or testing scenarios
    if (!process.env.SKIP_AUTO_SCHEMA_SYNC) {
      try {
        await this.createDatabasesIfNotExist();
        await this.syncAllDatabases();
        this.logger.log('✅ Fallback database schema synchronization completed');
      } catch (error) {
        this.logger.error('❌ Fallback database schema synchronization failed:', error);
        // Don't throw error here to prevent app from crashing
      }
    }
  }

  private async syncAllDatabases(): Promise<void> {
    const schemas = this.getDatabaseSchemas();
    for (const schema of schemas) {
      await this.syncDatabase(schema);
    }
  }

  private getDatabaseSchemas(): SchemaInfo[] {
    return [
      {
        name: 'Primary Database',
        expectedTables: ['users', 'fleets', 'vehicles'],
        schemaPath: 'src/database/prisma/primary.prisma',
        service: this.primaryDb,
        migrateCommand: 'npm run prisma:deploy:primary',
        databaseUrl: this.configService.primaryDatabase.url,
        databaseName: this.extractDatabaseName(this.configService.primaryDatabase.url)
      },
      {
        name: 'Logs Database', 
        expectedTables: ['application_logs', 'audit_logs', 'system_logs', 'error_logs'],
        schemaPath: 'src/database/prisma/logs.prisma',
        service: this.logsDb,
        migrateCommand: 'npm run prisma:deploy:logs',
        databaseUrl: this.configService.logsDatabase.url,
        databaseName: this.extractDatabaseName(this.configService.logsDatabase.url)
      },
      {
        name: 'Address Database',
        expectedTables: ['addresses', 'locations', 'geo_fences', 'routes'],
        schemaPath: 'src/database/prisma/address.prisma', 
        service: this.addressDb,
        migrateCommand: 'npm run prisma:deploy:address',
        databaseUrl: this.configService.addressDatabase.url,
        databaseName: this.extractDatabaseName(this.configService.addressDatabase.url)
      }
    ];
  }

  private async syncDatabase(schema: SchemaInfo): Promise<void> {
    this.logger.log(`🔍 Checking ${schema.name} schema...`);

    try {
      // First, ensure the database exists
      await this.createDatabaseIfNotExists(schema);
      
      // Small delay to ensure database is fully ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Then check for missing tables
      const missingTables = await this.checkMissingTables(schema);
      
      if (missingTables.length > 0) {
        this.logger.warn(`⚠️ ${schema.name} missing tables: ${missingTables.join(', ')}`);
        await this.runSchemaMigration(schema);
      } else {
        this.logger.log(`✅ ${schema.name} schema is up to date`);
      }
    } catch (error) {
      this.logger.error(`❌ Error checking ${schema.name}:`, error);
      
      // If we still can't check tables, attempt to run migration anyway
      this.logger.log(`🔄 Attempting to create ${schema.name} schema and tables...`);
      try {
        await this.runSchemaMigration(schema);
      } catch (migrationError) {
        this.logger.error(`❌ Failed to create ${schema.name} schema:`, migrationError);
        // Don't throw here - log error and continue
      }
    }
  }

  private async checkMissingTables(schema: SchemaInfo): Promise<string[]> {
    const missingTables: string[] = [];

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const result = await schema.service.$queryRaw`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        `;

        const existingTables = result.map((row: any) => row.table_name);
        
        for (const expectedTable of schema.expectedTables) {
          if (!existingTables.includes(expectedTable)) {
            missingTables.push(expectedTable);
          }
        }

        this.logger.debug(`${schema.name} - Expected: [${schema.expectedTables.join(', ')}]`);
        this.logger.debug(`${schema.name} - Existing: [${existingTables.join(', ')}]`);
        
        return missingTables;

      } catch (error: any) {
        // If database just got created, allow a few retries for initialization
        const isInitError = error?.name?.includes('PrismaClientInitializationError') || error?.message?.includes('does not exist');
        attempt++;

        if (isInitError && attempt < maxRetries) {
          this.logger.warn(`⚠️ ${schema.name}: database not ready yet, retrying table check (${attempt}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }

        this.logger.error(`Error checking tables in ${schema.name}:`, error);
        // If we can't query the database, assume all tables are missing
        return [...schema.expectedTables];
      }
    }

    // Fallback: assume missing
    return [...schema.expectedTables];
  }

  private async runSchemaMigration(schema: SchemaInfo): Promise<void> {
    this.logger.log(`🚀 Running intelligent schema migration for ${schema.name}...`);

    const isProduction = process.env.NODE_ENV === 'production';
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    this.logger.log(`🧪 Auto-detecting best migration approach for ${nodeEnv} environment...`);

    // Automatically choose the best strategy based on environment and database state
    const migrationSuccess = await this.runIntelligentStrategy(schema, isProduction);
    
    if (!migrationSuccess) {
      throw new Error(`Failed to create schema for ${schema.name}`);
    }
  }

  /**
   * Run db push strategy
   */
  private async runDbPush(schema: SchemaInfo): Promise<boolean> {
    try {
      const pushCommand = `npx prisma db push --schema=${schema.schemaPath} --accept-data-loss`;
      this.logger.log(`📦 Executing db push: ${pushCommand}`);
      
      const { stdout, stderr } = await execAsync(pushCommand, {
        cwd: process.cwd(),
        timeout: 120000
      });

      if (stdout) {
        this.logger.log(`✅ DB push output: ${stdout}`);
      }
      
      if (stderr && !stderr.includes('warning')) {
        this.logger.warn(`⚠️ DB push warnings: ${stderr}`);
      }

      this.logger.log(`✅ ${schema.name} db push completed successfully`);
      return true;

    } catch (error: any) {
      this.logger.error(`❌ DB push failed for ${schema.name}:`, error.message);
      return false;
    }
  }

  /**
   * Run seeders for databases (currently primary only)
   */
  public async runSeeds(): Promise<void> {
    try {
      // 0) Pre-clean duplicates to avoid uniqueness issues and growth over time
      try {
        const deleted = await this.primaryDb.$executeRawUnsafe(
          'DELETE FROM device_types a USING device_types b WHERE a.name = b.name AND a.id > b.id;'
        );
        if (typeof deleted === 'number' && deleted > 0) {
          this.logger.log(`🧹 Removed ${deleted} duplicate device_types rows (by name)`);
        }
      } catch (cleanErr: any) {
        this.logger.warn(`⚠️ Duplicate cleanup skipped/failed: ${cleanErr?.message || cleanErr}`);
      }

      // 1) Run Prisma seed orchestrator (idempotent seeding inside)
      const seedCmd = 'npx prisma db seed --schema=src/database/prisma/primary.prisma';
      this.logger.log(`🌱 Running seeds: ${seedCmd}`);
      const { stdout, stderr } = await execAsync(seedCmd, { cwd: process.cwd(), timeout: 180000 });
      if (stdout) this.logger.log(stdout);
      if (stderr && !stderr.toLowerCase().includes('warning')) this.logger.warn(stderr);
      this.logger.log('✅ Seeding completed');
    } catch (error: any) {
      this.logger.error('❌ Seeding failed:', error?.message || error);
      // Continue without throwing to avoid blocking app startup
    }
  }

  /**
   * Run migrate deploy strategy
   */
  private async runMigrateDeploy(schema: SchemaInfo): Promise<boolean> {
    try {
      this.logger.log(`📦 Executing migration: ${schema.migrateCommand}`);
      
      const { stdout, stderr } = await execAsync(schema.migrateCommand, {
        cwd: process.cwd(),
        timeout: 120000
      });

      if (stdout) {
        this.logger.log(`✅ Migration output: ${stdout}`);
      }
      
      if (stderr && !stderr.includes('warning')) {
        this.logger.warn(`⚠️ Migration warnings: ${stderr}`);
      }

      this.logger.log(`✅ ${schema.name} migration completed successfully`);
      return true;

    } catch (error: any) {
      this.logger.error(`❌ Migration failed for ${schema.name}:`, error.message);
      return false;
    }
  }

  /**
   * Run intelligent strategy (automatic detection and execution)
   */
  private async runIntelligentStrategy(schema: SchemaInfo, isProduction: boolean): Promise<boolean> {
    this.logger.log(`🧪 ${schema.name}: Analyzing database state for intelligent migration...`);

    // Step 1: Check if database exists and what state it's in
    const databaseState = await this.analyzeDatabaseState(schema);
    this.logger.log(`🔍 Database state analysis: ${databaseState}`);

    // Step 2: Choose strategy based on state and environment
    if (databaseState === 'fresh' || databaseState === 'empty') {
      // Fresh or empty database - use db push for speed and simplicity
      this.logger.log(`⚡ Fresh database detected, using fast db push approach...`);
      if (await this.runDbPush(schema)) {
        return true;
      }
      this.logger.warn(`⚠️ DB push failed, trying migration as fallback...`);
    }

    // Step 3: Try migrate deploy for existing databases or if push failed
    if (databaseState === 'exists-with-migrations' || isProduction) {
      this.logger.log(`🛡️ Production or existing database detected, using safe migrations...`);
      if (await this.runMigrateDeploy(schema)) {
        return true;
      }
    } else {
      this.logger.log(`📚 Attempting migration deployment...`);
      if (await this.runMigrateDeploy(schema)) {
        return true;
      }
    }

    // Step 4: Final fallback for development environments only
    if (!isProduction && (databaseState === 'fresh' || databaseState === 'empty' || databaseState === 'corrupted')) {
      this.logger.log(`🔄 Development environment: attempting force reset as final fallback...`);
      try {
        const pushCommand = `npx prisma db push --schema=${schema.schemaPath} --accept-data-loss --force-reset`;
        this.logger.log(`📦 Executing force reset: ${pushCommand}`);
        
        const { stdout: finalStdout, stderr: finalStderr } = await execAsync(pushCommand, {
          cwd: process.cwd(),
          timeout: 120000
        });

        if (finalStdout) {
          this.logger.log(`✅ Force reset output: ${finalStdout}`);
        }
        
        this.logger.log(`✅ ${schema.name} force reset completed successfully`);
        return true;

      } catch (finalError: any) {
        this.logger.error(`❌ All migration attempts failed for ${schema.name}:`, finalError.message);
        return false;
      }
    }
    
    this.logger.error(`❌ No suitable migration strategy found for ${schema.name} in ${isProduction ? 'production' : 'development'} environment`);
    return false;
  }

  /**
   * Analyze the state of a database to determine the best migration approach
   */
  private async analyzeDatabaseState(schema: SchemaInfo): Promise<'fresh' | 'empty' | 'exists-with-migrations' | 'corrupted' | 'unknown'> {
    try {
      // Check if database exists at all
      const databaseExists = await this.checkDatabaseExists(schema);
      
      if (!databaseExists) {
        this.logger.debug(`${schema.name}: Database does not exist - state: fresh`);
        return 'fresh';
      }

      // Database exists, check if it has any tables
      const missingTables = await this.checkMissingTables(schema);
      const totalExpectedTables = schema.expectedTables.length;
      const existingTablesCount = totalExpectedTables - missingTables.length;
      
      if (existingTablesCount === 0) {
        this.logger.debug(`${schema.name}: Database exists but no tables found - state: empty`);
        return 'empty';
      }
      
      if (missingTables.length === 0) {
        // All expected tables exist, check for Prisma migrations table
        if (await this.checkPrismaMigrationsExist(schema)) {
          this.logger.debug(`${schema.name}: All tables exist with migrations - state: exists-with-migrations`);
          return 'exists-with-migrations';
        } else {
          this.logger.debug(`${schema.name}: Tables exist but no migration history - state: empty`);
          return 'empty';
        }
      }
      
      if (existingTablesCount > 0 && missingTables.length > 0) {
        this.logger.debug(`${schema.name}: Partial tables exist (${existingTablesCount}/${totalExpectedTables}) - state: corrupted`);
        return 'corrupted';
      }
      
      return 'unknown';
      
    } catch (error) {
      this.logger.warn(`${schema.name}: Could not analyze database state - assuming fresh:`, error);
      return 'fresh';
    }
  }

  /**
   * Check if Prisma migrations table exists
   */
  private async checkPrismaMigrationsExist(schema: SchemaInfo): Promise<boolean> {
    try {
      const result = await schema.service.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
      `;
      
      return Array.isArray(result) && result.length > 0;
    } catch (error) {
      this.logger.debug(`${schema.name}: Could not check Prisma migrations table:`, error);
      return false;
    }
  }

  /**
   * Manual method to trigger schema sync (useful for testing or manual operations)
   */
  async manualSync(): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log('🔧 Manual database schema synchronization triggered...');
      await this.createDatabasesIfNotExist();
      await this.syncAllDatabases();
      return { success: true, message: 'Schema synchronization completed successfully' };
    } catch (error: any) {
      this.logger.error('❌ Manual schema synchronization failed:', error);
      return { success: false, message: `Schema synchronization failed: ${error.message}` };
    }
  }

  /**
   * Manual method to trigger database creation (useful for testing or manual operations)
   */
  async manualCreateDatabases(): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log('🔧 Manual database creation triggered...');
      await this.createDatabasesIfNotExist();
      return { success: true, message: 'Database creation completed successfully' };
    } catch (error: any) {
      this.logger.error('❌ Manual database creation failed:', error);
      return { success: false, message: `Database creation failed: ${error.message}` };
    }
  }

  /**
   * Check the current status of all databases without running migrations
   */
  async checkDatabaseStatus(): Promise<{
    primary: { missing: string[]; status: string };
    logs: { missing: string[]; status: string };
    address: { missing: string[]; status: string };
  }> {
    const schemas = this.getDatabaseSchemas().map(schema => ({
      ...schema,
      migrateCommand: '' // Clear migrate command for status checks
    }));

    const status: any = {};

    for (const schema of schemas) {
      try {
        const missing = await this.checkMissingTables(schema);
        const key = schema.name.split(' ')[0].toLowerCase();
        status[key] = {
          missing,
          status: missing.length === 0 ? 'up-to-date' : 'missing-tables'
        };
      } catch (error) {
        const key = schema.name.split(' ')[0].toLowerCase();
        status[key] = {
          missing: schema.expectedTables,
          status: 'connection-error'
        };
      }
    }

    return status;
  }

  /**
   * Create all databases if they don't exist
   */
  private async createDatabasesIfNotExist(): Promise<void> {
    this.logger.log('🏗️ Checking if databases exist...');
    
    const schemas = this.getDatabaseSchemas();
    
    for (const schema of schemas) {
      await this.createDatabaseIfNotExists(schema);
    }
  }

  /**
   * Create a single database if it doesn't exist
   */
  private async createDatabaseIfNotExists(schema: SchemaInfo): Promise<void> {
    try {
      this.logger.log(`🔍 Checking if ${schema.name} (${schema.databaseName}) exists...`);
      
      const exists = await this.checkDatabaseExists(schema);
      
      if (!exists) {
        this.logger.log(`🏗️ Creating ${schema.name} (${schema.databaseName})...`);
        await this.createDatabase(schema);
        this.logger.log(`✅ ${schema.name} created successfully`);
      } else {
        this.logger.log(`✅ ${schema.name} already exists`);
      }
      
    } catch (error) {
      this.logger.error(`❌ Error creating ${schema.name}:`, error);
      // Don't throw here - continue with other databases
    }
  }

  /**
   * Check if a database exists
   */
  private async checkDatabaseExists(schema: SchemaInfo): Promise<boolean> {
    const connectionInfo = this.parsePostgresUrl(schema.databaseUrl);
    let client: Client | null = null;
    
    try {
      // Connect to postgres system database to check if target database exists
      client = new Client({
        host: connectionInfo.host,
        port: connectionInfo.port,
        user: connectionInfo.user,
        password: connectionInfo.password,
        database: 'postgres' // Connect to system database
      });
      
      await client.connect();
      
      const result = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [schema.databaseName]
      );
      
      return (result.rowCount ?? 0) > 0;
      
    } catch (error) {
      this.logger.error(`Error checking if ${schema.name} exists:`, error);
      return false;
    } finally {
      if (client) {
        try {
          await client.end();
        } catch (error) {
          // Ignore connection cleanup errors
        }
      }
    }
  }

  /**
   * Create a database
   */
  private async createDatabase(schema: SchemaInfo): Promise<void> {
    const connectionInfo = this.parsePostgresUrl(schema.databaseUrl);
    let client: Client | null = null;
    
    try {
      // Connect to postgres system database to create target database
      client = new Client({
        host: connectionInfo.host,
        port: connectionInfo.port,
        user: connectionInfo.user,
        password: connectionInfo.password,
        database: 'postgres' // Connect to system database
      });
      
      await client.connect();
      
      // Create database (cannot use parameterized query for database name)
      const sanitizedDbName = schema.databaseName.replace(/[^a-zA-Z0-9_]/g, '');
      await client.query(`CREATE DATABASE "${sanitizedDbName}"`);
      
    } catch (error: any) {
      if (error.code === '42P04') {
        // Database already exists, that's okay
        this.logger.log(`${schema.name} already exists`);
      } else {
        throw error;
      }
    } finally {
      if (client) {
        try {
          await client.end();
        } catch (error) {
          // Ignore connection cleanup errors
        }
      }
    }
  }

  /**
   * Extract database name from a PostgreSQL connection URL
   */
  private extractDatabaseName(url: string): string {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.pathname.slice(1); // Remove leading slash
    } catch (error) {
      this.logger.error('Error parsing database URL:', error);
      throw new Error('Invalid database URL format');
    }
  }

  /**
   * Parse PostgreSQL connection URL into components
   */
  private parsePostgresUrl(url: string) {
    try {
      const parsedUrl = new URL(url);
      
      return {
        host: parsedUrl.hostname,
        port: parseInt(parsedUrl.port) || 5432,
        user: parsedUrl.username,
        password: parsedUrl.password,
        database: parsedUrl.pathname.slice(1) // Remove leading slash
      };
    } catch (error) {
      this.logger.error('Error parsing database URL:', error);
      throw new Error('Invalid database URL format');
    }
  }
}
