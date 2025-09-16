import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Redis, RedisOptions, Cluster } from 'ioredis';
import { ConfigService } from '../config/config.service';

export interface RedisConnectionConfig {
  host: string;
  port: number;
  password?: string;
  tls?: boolean;
  maxRetriesPerRequest: number;
  connectTimeout: number;
  lazyConnect: boolean;
  enableOfflineQueue: boolean;
  retryStrategy: (times: number) => number;
  keyPrefix?: string;
  db?: number;
}

export interface RedisClients {
  main: Redis;
  cache: Redis;
  sessions: Redis;
  rateLimit: Redis;
  abuse: Redis;
  queues: Redis;
}

@Injectable()
export class RedisConnectionProvider implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisConnectionProvider.name);
  private clients: RedisClients;
  private isClusterMode = false;

  constructor(private readonly configService: ConfigService) { }

  async onModuleInit() {
    await this.initializeConnections();
  }

  async onModuleDestroy() {
    await this.closeAllConnections();
  }

  private async initializeConnections() {
    const baseConfig = this.getBaseRedisConfig();

    // Check if Redis Cluster is configured
    const clusterNodes = process.env.REDIS_CLUSTER_NODES;
    if (clusterNodes) {
      this.isClusterMode = true;
      await this.initializeClusterConnections(clusterNodes, baseConfig);
    } else {
      await this.initializeSingleNodeConnections(baseConfig);
    }

    this.logger.log(`Redis connections initialized (${this.isClusterMode ? 'Cluster' : 'Single'} mode)`);
  }

  private getBaseRedisConfig(): RedisConnectionConfig {
    return {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      tls: process.env.REDIS_TLS === 'true',
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: (times: number) => Math.min(times * 100, 2000),
    };
  }

  private async initializeSingleNodeConnections(baseConfig: RedisConnectionConfig) {
    // Main Redis client (general operations)
    this.clients = {
      main: this.createRedisClient({ ...baseConfig, db: 0, keyPrefix: 'app:' }),
      cache: this.createRedisClient({ ...baseConfig, db: 1, keyPrefix: 'cache:' }),
      sessions: this.createRedisClient({ ...baseConfig, db: 2, keyPrefix: 'session:' }),
      rateLimit: this.createRedisClient({ ...baseConfig, db: 3, keyPrefix: 'rate:' }),
      abuse: this.createRedisClient({ ...baseConfig, db: 4, keyPrefix: 'abuse:' }),
      queues: this.createRedisClient({ ...baseConfig, db: 5, keyPrefix: 'queue:' }),
    };

    await this.waitForConnections();
  }

  private async initializeClusterConnections(clusterNodes: string, baseConfig: RedisConnectionConfig) {
    const nodes = clusterNodes.split(',').map(node => {
      const [host, port] = node.trim().split(':');
      return { host, port: parseInt(port) };
    });

    // In cluster mode, use different key prefixes instead of different databases
    this.clients = {
      main: this.createClusterClient(nodes, { ...baseConfig, keyPrefix: 'app:' }),
      cache: this.createClusterClient(nodes, { ...baseConfig, keyPrefix: 'cache:' }),
      sessions: this.createClusterClient(nodes, { ...baseConfig, keyPrefix: 'session:' }),
      rateLimit: this.createClusterClient(nodes, { ...baseConfig, keyPrefix: 'rate:' }),
      abuse: this.createClusterClient(nodes, { ...baseConfig, keyPrefix: 'abuse:' }),
      queues: this.createClusterClient(nodes, { ...baseConfig, keyPrefix: 'queue:' }),
    };

    await this.waitForConnections();
  }

  private createRedisClient(config: RedisConnectionConfig): Redis {
    const options: RedisOptions = {
      host: config.host,
      port: config.port,
      password: config.password,
      tls: config.tls ? {} : undefined,
      db: config.db,
      keyPrefix: config.keyPrefix,
      connectTimeout: config.connectTimeout,
      lazyConnect: config.lazyConnect,
      maxRetriesPerRequest: config.maxRetriesPerRequest,
      enableOfflineQueue: config.enableOfflineQueue,
      retryStrategy: config.retryStrategy,
      // Performance optimizations
      showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
    };

    const client = new Redis(options);

    client.on('connect', () => {
      this.logger.debug(`Redis client connected: ${config.keyPrefix}`);
    });

    client.on('error', (error) => {
      this.logger.error(`Redis client error (${config.keyPrefix}):`, error.message);
    });

    client.on('reconnecting', () => {
      this.logger.warn(`Redis client reconnecting: ${config.keyPrefix}`);
    });

    return client;
  }

  private createClusterClient(nodes: Array<{ host: string, port: number }>, config: RedisConnectionConfig): Redis {
    return new Cluster(nodes, {
      redisOptions: {
        password: config.password,
        tls: config.tls ? {} : undefined,
        keyPrefix: config.keyPrefix,
        connectTimeout: config.connectTimeout,
        lazyConnect: config.lazyConnect,
        maxRetriesPerRequest: config.maxRetriesPerRequest,
      },
      enableOfflineQueue: config.enableOfflineQueue,
      maxRedirections: 3,
      scaleReads: 'slave', // Read from slaves when possible
    }) as any;
  }

  private async waitForConnections() {
    const connectionPromises = Object.entries(this.clients).map(async ([name, client]) => {
      try {
        await client.ping();
        this.logger.debug(`Redis client ${name} connected successfully`);
      } catch (error) {
        this.logger.error(`Failed to connect Redis client ${name}:`, error.message);
        throw error;
      }
    });

    await Promise.all(connectionPromises);
  }

  private async closeAllConnections() {
    const disconnectionPromises = Object.entries(this.clients).map(async ([name, client]) => {
      try {
        if (client.status === 'ready') {
          await client.quit();
        } else {
          client.disconnect(false);
        }
        this.logger.debug(`Redis client ${name} disconnected`);
      } catch (error) {
        try { client.disconnect(false); } catch { }
        this.logger.error(`Error disconnecting Redis client ${name}:`, error.message);
      }
    });

    await Promise.all(disconnectionPromises);
  }

  // Public getters for different Redis clients
  getMainClient(): Redis {
    if (!this.clients) {
      throw new Error('Redis clients not initialized. Make sure RedisConnectionProvider.onModuleInit() is called first.');
    }
    return this.clients.main;
  }

  getCacheClient(): Redis {
    if (!this.clients) {
      throw new Error('Redis clients not initialized. Make sure RedisConnectionProvider.onModuleInit() is called first.');
    }
    return this.clients.cache;
  }

  getSessionsClient(): Redis {
    if (!this.clients) {
      throw new Error('Redis clients not initialized. Make sure RedisConnectionProvider.onModuleInit() is called first.');
    }
    return this.clients.sessions;
  }

  getRateLimitClient(): Redis {
    if (!this.clients) {
      throw new Error('Redis clients not initialized. Make sure RedisConnectionProvider.onModuleInit() is called first.');
    }
    return this.clients.rateLimit;
  }

  getAbuseClient(): Redis {
    if (!this.clients) {
      throw new Error('Redis clients not initialized. Make sure RedisConnectionProvider.onModuleInit() is called first.');
    }
    return this.clients.abuse;
  }

  getQueuesClient(): Redis {
    if (!this.clients) {
      throw new Error('Redis clients not initialized. Make sure RedisConnectionProvider.onModuleInit() is called first.');
    }
    return this.clients.queues;
  }

  // Health check for all connections
  async healthCheck(): Promise<{ [key: string]: boolean }> {
    const healthResults: { [key: string]: boolean } = {};

    for (const [name, client] of Object.entries(this.clients)) {
      try {
        await client.ping();
        healthResults[name] = true;
      } catch (error) {
        this.logger.error(`Redis health check failed for ${name}:`, error.message);
        healthResults[name] = false;
      }
    }

    return healthResults;
  }

  // Get connection statistics
  async getConnectionStats(): Promise<{ [key: string]: any }> {
    const stats: { [key: string]: any } = {};

    for (const [name, client] of Object.entries(this.clients)) {
      try {
        const info = await client.info('clients');
        stats[name] = {
          connected: client.status === 'ready',
          mode: this.isClusterMode ? 'cluster' : 'standalone',
          info: this.parseRedisInfo(info),
        };
      } catch (error) {
        stats[name] = { error: error.message };
      }
    }

    return stats;
  }

  private parseRedisInfo(info: string): any {
    const lines = info.split('\n');
    const parsed: any = {};

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (key && value) {
          parsed[key.trim()] = isNaN(Number(value)) ? value.trim() : Number(value);
        }
      }
    }

    return parsed;
  }
}