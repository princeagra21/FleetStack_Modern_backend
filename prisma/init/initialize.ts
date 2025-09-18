import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

interface DatabaseConfig {
    name: string;
    schemaPath: string;
    description: string;
}

const databases: DatabaseConfig[] = [
    {
        name: 'primary',
        schemaPath: 'prisma/schema.prisma',
        description: 'Primary Database (Core Business Logic)'
    },
    {
        name: 'logs',
        schemaPath: 'prisma/logs.prisma',
        description: 'Logs Database (Tracking & Monitoring)'
    },
    {
        name: 'address',
        schemaPath: 'prisma/address.prisma',
        description: 'Address Database (Geographic Data)'
    }
];

class PrismaInitializer {
    private readonly rootPath: string;

    constructor() {
        this.rootPath = path.resolve(__dirname, '../..');
    }

    private async runCommand(command: string, description: string): Promise<void> {
        console.log(`🔄 ${description}...`);

        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd: this.rootPath,
                timeout: 120000
            });

            if (stdout) {
                console.log(`✅ ${description} completed successfully`);
                if (process.env.NODE_ENV === 'development') {
                    console.log(`   Output: ${stdout.trim()}`);
                }
            }

            if (stderr && !stderr.includes('warn')) {
                console.warn(`⚠️  ${description} warnings:`, stderr.trim());
            }
        } catch (error: any) {
            console.error(`❌ ${description} failed:`, error.message);

            if (error.stdout) {
                console.log('   Stdout:', error.stdout);
            }
            if (error.stderr) {
                console.error('   Stderr:', error.stderr);
            }

            throw new Error(`Failed to execute: ${description}`);
        }
    }

    private async generatePrismaClients(): Promise<void> {
        console.log('\n📦 Generating Prisma Clients...\n');

        for (const db of databases) {
            await this.runCommand(
                `npx prisma generate --schema=${db.schemaPath}`,
                `Generating ${db.description} client`
            );
        }
    }

    private async pushDatabaseSchemas(): Promise<void> {
        console.log('\n🚀 Pushing Database Schemas...\n');

        for (const db of databases) {
            await this.runCommand(
                `npx prisma db push --schema=${db.schemaPath} --accept-data-loss`,
                `Pushing ${db.description} schema`
            );
        }
    }

    private async checkDatabaseConnections(): Promise<void> {
        console.log('\n🔍 Checking Database Connections...\n');

        const requiredEnvVars = [
            'PRIMARY_DATABASE_URL',
            'LOGS_DATABASE_URL',
            'ADDRESS_DATABASE_URL'
        ];

        const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }

        console.log('✅ All required database environment variables are present');
    }

    private async createDirectories(): Promise<void> {
        console.log('\n📁 Creating necessary directories...\n');

        const directories = [
            'generated/prisma/primary',
            'generated/prisma/logs',
            'generated/prisma/address'
        ];

        for (const dir of directories) {
            const fullPath = path.join(this.rootPath, dir);

            try {
                await execAsync(`mkdir -p "${fullPath}"`);
                console.log(`✅ Directory created/verified: ${dir}`);
            } catch (error: any) {
                console.warn(`⚠️  Could not create directory ${dir}:`, error.message);
            }
        }
    }

    public async initialize(): Promise<void> {
        const startTime = Date.now();

        console.log('🚀 Starting Prisma Initialization...\n');
        console.log('='.repeat(60));

        try {
            await this.checkDatabaseConnections();
            await this.createDirectories();
            await this.generatePrismaClients();
            await this.pushDatabaseSchemas();

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);

            console.log('\n' + '='.repeat(60));
            console.log(`🎉 Prisma initialization completed successfully in ${duration}s`);
            console.log('✅ All databases are ready for use');
            console.log('='.repeat(60) + '\n');

        } catch (error: any) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);

            console.log('\n' + '='.repeat(60));
            console.error(`💥 Prisma initialization failed after ${duration}s`);
            console.error('Error:', error.message);
            console.log('='.repeat(60) + '\n');

            throw error;
        }
    }

    public async initializeWithRetry(maxRetries: number = 3): Promise<void> {
        let attempt = 1;

        while (attempt <= maxRetries) {
            try {
                if (attempt > 1) {
                    console.log(`\n🔄 Retry attempt ${attempt}/${maxRetries}...\n`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                await this.initialize();
                return;

            } catch (error: any) {
                console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, error.message);

                if (attempt === maxRetries) {
                    console.error('💥 All retry attempts exhausted. Prisma initialization failed.');
                    throw error;
                }

                attempt++;
            }
        }
    }
}

export async function initializePrisma(enableRetry: boolean = true): Promise<void> {
    const initializer = new PrismaInitializer();

    if (enableRetry) {
        await initializer.initializeWithRetry();
    } else {
        await initializer.initialize();
    }
}

export default PrismaInitializer;

if (require.main === module) {
    initializePrisma()
        .then(() => {
            console.log('🎯 Prisma initialization script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Prisma initialization script failed:', error.message);
            process.exit(1);
        });
}
