import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { PrimaryDatabaseService } from '../database/services/primary-database.service';
import { ConfigService } from '../config/config.service';
import { spawn } from 'child_process';
import * as net from 'net';

// Circuit Breaker States
enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, requests fail fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service is back
}

interface CircuitBreakerConfig {
  failureThreshold: number;     // Number of failures to open circuit
  resetTimeout: number;         // Time to wait before trying again
  monitoringPeriod: number;     // Time window for counting failures
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private isRedisAvailable = false;
  private circuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;
  private readonly circuitBreakerConfig: CircuitBreakerConfig = {
    failureThreshold: 5,        // Open circuit after 5 failures
    resetTimeout: 30000,        // Wait 30 seconds before retry
    monitoringPeriod: 60000,    // Count failures in 60 second window
  };
  private gracefulShutdownPromise: Promise<void> | null = null;

  constructor(
    private readonly primaryDb: PrimaryDatabaseService,
    private readonly configService: ConfigService
  ) {
    this.initializeRedisClient();
  }

  private initializeRedisClient() {
    // Initialize Redis client with resilient configuration
    const redisUrl = process.env.REDIS_URL;
    const clientConfig = {
      // 🚀 FIXED: Removed unsupported connectTimeout and commandTimeout options
      // These options don't exist in current ioredis and could cause instability
      lazyConnect: true,
      maxRetriesPerRequest: 2,       // Reduced from 3 to 2
      enableOfflineQueue: false,
      retryDelayOnFailover: 1000,
      // 🚀 RESILIENT RETRY STRATEGY - Exponential backoff with max limit
      retryStrategy: (times) => {
        if (times > 10) {
          // Stop retrying after 10 attempts to prevent infinite loops
          this.logger.warn(`🔴 Redis retry limit reached (${times} attempts). Entering circuit breaker mode.`);
          this.openCircuit('Max retry attempts reached');
          return null; // Stop retrying
        }
        const delay = Math.min(times * 1000, 30000); // Max 30 second delay
        this.logger.warn(`⚡ Redis retry attempt ${times} in ${delay}ms`);
        return delay;
      },
    };

    if (redisUrl) {
      this.client = new Redis(redisUrl, clientConfig);
    } else {
      const redisConfig = { ...this.getRedisConfig(), ...clientConfig };
      this.client = new Redis(redisConfig);
    }

    this.setupRedisEventHandlers();
  }

  private setupRedisEventHandlers() {
    this.client.on('connect', () => {
      this.logger.log('✅ Redis connected successfully');
      this.isRedisAvailable = true;
      this.resetCircuitBreaker();
    });

    this.client.on('ready', () => {
      this.logger.log('🚀 Redis client ready for commands');
      this.isRedisAvailable = true;
    });

    this.client.on('error', (error) => {
      this.handleRedisError(error);
    });

    this.client.on('close', () => {
      this.logger.warn('🟡 Redis connection closed');
      this.isRedisAvailable = false;
    });

    this.client.on('reconnecting', (ms) => {
      this.logger.log(`🔄 Redis reconnecting in ${ms}ms...`);
    });

    this.client.on('end', () => {
      this.logger.warn('🔴 Redis connection ended');
      this.isRedisAvailable = false;
    });
  }

  private handleRedisError(error: Error) {
    this.logger.error('🔴 Redis connection error:', error.message);
    this.isRedisAvailable = false;
    this.recordFailure();
    
    // Don't spam logs with repeated ECONNREFUSED errors
    if (!error.message.includes('ECONNREFUSED')) {
      this.logger.error('Redis error details:', error);
    }
  }

  private recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.circuitBreakerConfig.failureThreshold) {
      this.openCircuit('Failure threshold exceeded');
    }
  }

  private openCircuit(reason: string) {
    if (this.circuitBreakerState !== CircuitBreakerState.OPEN) {
      this.circuitBreakerState = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.circuitBreakerConfig.resetTimeout;
      this.logger.warn(`🔴 Circuit breaker OPEN: ${reason}. Next attempt in ${this.circuitBreakerConfig.resetTimeout / 1000}s`);
    }
  }

  private resetCircuitBreaker() {
    if (this.circuitBreakerState !== CircuitBreakerState.CLOSED) {
      this.circuitBreakerState = CircuitBreakerState.CLOSED;
      this.failureCount = 0;
      this.logger.log('✅ Circuit breaker RESET - Redis service restored');
    }
  }

  private canAttemptOperation(): boolean {
    const now = Date.now();
    
    switch (this.circuitBreakerState) {
      case CircuitBreakerState.CLOSED:
        return true;
      
      case CircuitBreakerState.OPEN:
        if (now >= this.nextAttemptTime) {
          this.circuitBreakerState = CircuitBreakerState.HALF_OPEN;
          this.logger.log('🟡 Circuit breaker HALF-OPEN - Testing Redis availability');
          return true;
        }
        return false;
      
      case CircuitBreakerState.HALF_OPEN:
        return true;
      
      default:
        return false;
    }
  }

  // 🚀 REMOVED: Process-level signal handlers to prevent conflicts with NestJS lifecycle
  // Graceful shutdown is now handled exclusively through onModuleDestroy()
  // This prevents signal handler conflicts that could bypass NestJS proper shutdown sequence

  private async gracefulShutdown(): Promise<void> {
    if (this.gracefulShutdownPromise) {
      return this.gracefulShutdownPromise;
    }

    this.gracefulShutdownPromise = new Promise(async (resolve) => {
      try {
        this.logger.log('🛑 Starting Redis service shutdown...');
        
        // Set a timeout for shutdown
        const shutdownTimeout = setTimeout(() => {
          this.logger.warn('⚠️ Redis shutdown timeout, forcing close');
          resolve();
        }, 5000);

        if (this.client && this.client.status !== 'end') {
          await this.client.quit();
        }
        
        clearTimeout(shutdownTimeout);
        this.logger.log('✅ Redis service shutdown complete');
        resolve();
      } catch (error) {
        this.logger.error('❌ Error during Redis shutdown:', error);
        resolve(); // Continue shutdown even if Redis close fails
      }
    });

    return this.gracefulShutdownPromise;
  }

  async onModuleInit() {
    try {
      // 🚀 RESILIENT CONNECTION - Don't fail app startup if Redis is down
      await this.connectWithTimeout();
      // 🚨 DISABLED: Dangerous bulk sync removed for enterprise security
      // await this.syncUsersTableOnStartup();
      this.logger.log('✅ Redis connected successfully - using cache-aside pattern for security');
    } catch (error: any) {
      this.logger.warn('⚠️ Redis unavailable at startup - attempting to auto-start local Redis if configured:', error?.message);

      // Try to auto-start a local Redis server only for localhost setups
      if (await this.tryStartLocalRedis()) {
        this.logger.log('🔁 Retrying Redis connection after starting local server...');
        try {
          await this.connectWithTimeout();
          this.logger.log('✅ Redis connected after auto-start');
        } catch (err: any) {
          this.logger.warn('⚠️ Redis still unavailable after auto-start attempt:', err?.message);
          this.isRedisAvailable = false;
          this.openCircuit('Failed to connect after auto-start');
        }
      } else {
        this.isRedisAvailable = false;
        this.openCircuit('Failed to connect during initialization');
      }
      // Don't throw - allow application to start without Redis
    }
  }

  private async connectWithTimeout(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Redis connection timeout after 10 seconds'));
      }, 10000);

      this.client.connect()
        .then(() => {
          clearTimeout(timeout);
          resolve();
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  async onModuleDestroy() {
    await this.gracefulShutdown();
  }

  /**
   * Get Redis configuration from environment variables with fallbacks
   */
  private getRedisConfig() {
    // Fallback to individual config values from .env
    const config: any = {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      // These values will be overridden by initializeRedisClient
    };

    // Add password and TLS if provided in .env
    if (process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD.trim() !== '') {
      config.password = process.env.REDIS_PASSWORD;
    }

    if (process.env.REDIS_TLS === 'true') {
      config.tls = {};
    }

    this.logger.log(`Redis config loaded from .env - Host: ${config.host}, Port: ${config.port}`);
    return config;
  }

  /**
   * Auto-sync users table to Redis on application startup
   */
  async syncUsersTableOnStartup(): Promise<void> {
    if (!this.canAttemptOperation() || !this.isRedisAvailable) {
      this.logger.log('⚠️ Users table sync skipped - Redis unavailable (graceful degradation)');
      return;
    }

    try {
      this.logger.log('Starting users table sync to Redis...');
      
      // Fetch all users from PostgreSQL
      const users = await this.primaryDb.users.findMany({
        select: {
          uid: true,
          username: true,
          name: true,
          // Email excluded for security
          login_type: true,
          credits: true,
          created_at: true,
          updated_at: true,
        },
      });

      await this.executeRedisOperation(async () => {
        // Clear existing users cache using SCAN for better performance
        await this.clearKeysByPattern('user:*');

        // Sync users to Redis
        const pipeline = this.client.pipeline();
        for (const user of users) {
          const userKey = `user:${user.uid}`;
          const userData = {
            uid: user.uid,
            username: user.username,
            name: user.name,
            // Email excluded for security
            login_type: user.login_type,
            credits: user.credits.toString(), // Convert BigInt to string
            createdAt: user.created_at?.toISOString(),
            updatedAt: user.updated_at?.toISOString(),
          };
          pipeline.hset(userKey, userData);
          pipeline.expire(userKey, 300); // 5 minutes for security
        }

        await pipeline.exec();
        
        // Create username to uid mapping for faster lookups
        const usernamePipeline = this.client.pipeline();
        for (const user of users) {
          usernamePipeline.set(`username:${user.username}`, user.uid.toString(), 'EX', 300);
        }
        await usernamePipeline.exec();
      });

      this.logger.log(`Successfully synced ${users.length} users to Redis`);
    } catch (error) {
      this.logger.warn('Failed to sync users table to Redis (continuing without sync):', error.message);
      // Graceful degradation - don't fail startup
    }
  }

  /**
   * 🚀 RESILIENT CACHE-ASIDE: Get user by ID with graceful degradation
   * Falls back to database when Redis is unavailable
   */
  async getUserById(uid: number): Promise<any> {
    try {
      // Check circuit breaker state
      if (this.canAttemptOperation() && this.isRedisAvailable) {
        try {
          // Try Redis cache first
          const userData = await this.executeRedisOperation(() => 
            this.client.hgetall(`user:${uid}`)
          );
          
          if (userData && Object.keys(userData).length > 0) {
            // Cache hit - return minimal essential data
            return {
              uid: parseInt(userData.uid),
              username: userData.username,
              name: userData.name,
              login_type: userData.login_type,
              credits: userData.credits,
              createdAt: userData.createdAt ? new Date(userData.createdAt) : null,
              updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : null,
              // PII excluded from cache for security
            };
          }
        } catch (cacheError) {
          this.logger.debug(`Cache miss for user ${uid}, falling back to database`);
        }
      }

      // Cache miss or Redis unavailable - fetch from database
      const user = await this.primaryDb.users.findUnique({
        where: { uid },
        select: {
          uid: true,
          username: true,
          name: true,
          login_type: true,
          credits: true,
          created_at: true,
          updated_at: true,
          // Email excluded for security - fetch separately if needed
        },
      });

      if (!user) {
        return null;
      }

      // Try to cache data if Redis is available (non-blocking)
      this.tryCacheUser(user);

      return {
        uid: user.uid,
        username: user.username,
        name: user.name,
        login_type: user.login_type,
        credits: user.credits.toString(),
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };
    } catch (error) {
      this.logger.error(`Failed to get user ${uid}:`, error.message);
      return null;
    }
  }

  /**
   * Non-blocking cache operation - don't fail if Redis is down
   */
  private async tryCacheUser(user: any) {
    if (!this.canAttemptOperation() || !this.isRedisAvailable) {
      return;
    }

    try {
      const cacheData = {
        uid: user.uid.toString(),
        username: user.username,
        name: user.name,
        login_type: user.login_type,
        credits: user.credits.toString(),
        createdAt: user.created_at?.toISOString(),
        updatedAt: user.updated_at?.toISOString(),
      };
      
      await this.executeRedisOperation(async () => {
        await this.client.hset(`user:${user.uid}`, cacheData);
        await this.client.expire(`user:${user.uid}`, 300); // 5 minutes
      });
    } catch (error) {
      // Non-blocking - just log and continue
      this.logger.debug(`Failed to cache user ${user.uid}:`, error.message);
    }
  }

  /**
   * Get user by username with graceful degradation
   */
  async getUserByUsername(username: string): Promise<any> {
    try {
      // Try Redis lookup first if available
      if (this.canAttemptOperation() && this.isRedisAvailable) {
        try {
          const uid = await this.executeRedisOperation(() => 
            this.client.get(`username:${username}`)
          );
          if (uid) {
            return this.getUserById(parseInt(uid));
          }
        } catch (error) {
          this.logger.debug(`Username cache miss for ${username}, falling back to database`);
        }
      }

      // Fallback to database lookup
      const user = await this.primaryDb.users.findFirst({
        where: {
          OR: [
            { username: username },
            { email: username }
          ],
          is_active: true,
          deleted_at: null,
        },
        select: {
          uid: true,
          username: true,
          name: true,
          login_type: true,
          credits: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (user) {
        // Try to cache the username mapping (non-blocking)
        this.tryCacheUsernameMapping(user.username, user.uid);
        return {
          uid: user.uid,
          username: user.username,
          name: user.name,
          login_type: user.login_type,
          credits: user.credits.toString(),
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get user ${username}:`, error.message);
      return null;
    }
  }

  private async tryCacheUsernameMapping(username: string, uid: number | string | bigint) {
    if (!this.canAttemptOperation() || !this.isRedisAvailable) {
      return;
    }

    try {
      await this.executeRedisOperation(() =>
        this.client.set(`username:${username}`, uid.toString(), 'EX', 300)
      );
    } catch (error) {
      this.logger.debug(`Failed to cache username mapping for ${username}`);
    }
  }

  /**
   * 🚨 SECURITY FIXED: Set user data with graceful degradation
   * Excludes email and uses short 5-minute TTL for enterprise security
   */
  async setUser(uid: number | string | bigint, userData: any): Promise<void> {
    if (!this.canAttemptOperation() || !this.isRedisAvailable) {
      this.logger.debug(`Redis setUser operation skipped (circuit breaker): ${uid}`);
      return; // Graceful degradation - don't fail user operations
    }

    try {
      const userKey = `user:${uid}`;
      // 🔐 ENTERPRISE SECURITY: Exclude PII (email) from cache
      const dataToStore = {
        uid: userData.uid,
        username: userData.username,
        name: userData.name || userData.Name,
        // EMAIL EXCLUDED FOR SECURITY - fetch from DB when needed
        login_type: userData.login_type,
        credits: userData.credits?.toString() || '0',
        createdAt: userData.created_at?.toISOString() || userData.createdAt?.toISOString(),
        updatedAt: userData.updated_at?.toISOString() || userData.updatedAt?.toISOString(),
      };
      
      await this.executeRedisOperation(async () => {
        await this.client.hset(userKey, dataToStore);
        await this.client.expire(userKey, 300); // 🚀 5 minutes TTL for security
        
        // Update username mapping with consistent short TTL
        if (userData.username) {
          await this.client.set(`username:${userData.username}`, uid.toString(), 'EX', 300);
        }
      });
      
      this.logger.debug(`✅ User ${uid} cached securely (no PII, 5min TTL)`);
    } catch (error) {
      this.logger.debug(`Failed to set user ${uid} in Redis:`, error.message);
      // Graceful degradation - don't throw
    }
  }

  /**
   * Delete user from Redis with graceful degradation
   */
  async deleteUser(uid: number): Promise<void> {
    if (!this.canAttemptOperation() || !this.isRedisAvailable) {
      this.logger.debug(`Redis deleteUser operation skipped (circuit breaker): ${uid}`);
      return; // Graceful degradation
    }

    try {
      // Get username first to clean up mapping
      const userData = await this.getUserById(uid);
      
      await this.executeRedisOperation(async () => {
        await this.client.del(`user:${uid}`);
        
        if (userData?.username) {
          await this.client.del(`username:${userData.username}`);
        }
      });
    } catch (error) {
      this.logger.debug(`Failed to delete user ${uid} from Redis:`, error.message);
      // Graceful degradation - don't throw
    }
  }

  /**
   * Execute Redis operation with circuit breaker protection
   */
  private async executeRedisOperation<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.canAttemptOperation()) {
      throw new Error('Circuit breaker is OPEN - Redis unavailable');
    }

    try {
      const result = await operation();
      
      // Success - reset circuit breaker if it was half-open
      if (this.circuitBreakerState === CircuitBreakerState.HALF_OPEN) {
        this.resetCircuitBreaker();
      }
      
      return result;
    } catch (error) {
      this.handleRedisError(error as Error);
      throw error;
    }
  }

  /**
   * Attempt to auto-start a local Redis server if the configuration points to localhost.
   * This is a best-effort helper for local development on Windows/macOS/Linux.
   * You can override the executable path with REDIS_SERVER_CMD and config file via REDIS_CONF.
   */
  private async tryStartLocalRedis(): Promise<boolean> {
    try {
      if (!this.isLocalRedisConfig()) {
        this.logger.debug('⏭️ Auto-start skipped: Redis host is not local');
        return false;
      }

      const command = process.env.REDIS_SERVER_CMD || 'redis-server';
      const isWindows = process.platform === 'win32';
      const conf = process.env.REDIS_CONF; // optional redis.conf path

      const args: string[] = [];
      if (!isWindows) {
        // Daemonize on Unix-like systems so it runs in background
        args.push('--daemonize', 'yes');
      }
      if (conf) {
        args.push(conf);
      }

      this.logger.log(`🟢 Attempting to start local Redis server: ${command} ${args.join(' ')}`);

      // Start detached so it doesn't block the Node process
      const child = spawn(command, args, {
        detached: true,
        stdio: 'ignore',
        shell: isWindows, // allow .exe resolution and PATH lookup on Windows
      });

      // Detach child so it can continue running independently
      child.unref();

      // Wait for Redis to be ready
      const { host, port } = this.getTargetHostPort();
      const ready = await this.waitForRedisReady(host, port, 15000);

      if (ready) {
        this.logger.log('✅ Local Redis server started and is ready');
      } else {
        this.logger.warn('⏳ Local Redis server did not become ready within timeout');
      }
      return ready;
    } catch (error: any) {
      this.logger.warn(`❌ Failed to auto-start local Redis server: ${error?.message || error}`);
      return false;
    }
  }

  /**
   * Determine if Redis configuration targets localhost.
   */
  private isLocalRedisConfig(): boolean {
    try {
      const redisUrl = process.env.REDIS_URL;
      if (redisUrl) {
        const u = new URL(redisUrl);
        return ['127.0.0.1', 'localhost'].includes(u.hostname.toLowerCase());
      }
      const host = (process.env.REDIS_HOST || '127.0.0.1').toLowerCase();
      return ['127.0.0.1', 'localhost'].includes(host);
    } catch {
      return false;
    }
  }

  /**
   * Get target host/port for readiness checks.
   */
  private getTargetHostPort(): { host: string; port: number } {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        const u = new URL(redisUrl);
        return { host: u.hostname, port: parseInt(u.port || '6379', 10) };
      } catch {
        // Fall through to env host/port
      }
    }
    return {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    };
  }

  /**
   * Polls until a TCP connection to Redis succeeds or timeout is reached.
   */
  private async waitForRedisReady(host: string, port: number, timeoutMs: number): Promise<boolean> {
    const start = Date.now();

    return await new Promise<boolean>((resolve) => {
      const tryOnce = () => {
        const socket = new net.Socket();
        let done = false;

        const cleanup = () => {
          socket.removeAllListeners();
          try { socket.destroy(); } catch {}
        };

        socket.once('connect', () => {
          done = true;
          cleanup();
          resolve(true);
        });
        socket.once('error', () => {
          cleanup();
          if (Date.now() - start >= timeoutMs) {
            if (!done) resolve(false);
          } else {
            setTimeout(tryOnce, 500);
          }
        });

        socket.connect(port, host);
      };

      tryOnce();
    });
  }

  /**
   * Generic Redis operations with graceful degradation
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.canAttemptOperation() || !this.isRedisAvailable) {
      this.logger.debug(`Redis set operation skipped (circuit breaker): ${key}`);
      return; // Graceful degradation - don't fail the operation
    }

    try {
      await this.executeRedisOperation(() => {
        if (ttl) {
          return this.client.set(key, value, 'EX', ttl);
        } else {
          return this.client.set(key, value);
        }
      });
    } catch (error) {
      this.logger.debug(`Failed to set key ${key}:`, error.message);
      // Graceful degradation - don't throw, just log
    }
  }

  /**
   * SECURITY: Atomic set-if-not-exists with graceful degradation
   * Returns false if Redis is unavailable (fail-safe for security)
   */
  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (!this.canAttemptOperation() || !this.isRedisAvailable) {
      this.logger.warn(`🚨 SECURITY: setNx operation failed - Redis unavailable. Key: ${key}`);
      // SECURITY: Fail-safe - return false when Redis is down to prevent token reuse
      return false;
    }

    try {
      const result = await this.executeRedisOperation(() =>
        this.client.set(key, value, 'EX', ttlSeconds, 'NX')
      );
      return result === 'OK';
    } catch (error) {
      this.logger.warn(`🚨 SECURITY: setNx failed for key ${key}:`, error.message);
      // SECURITY: Fail-safe - return false on error
      return false;
    }
  }

  /**
   * SECURITY: Redis sorted set operations with graceful degradation
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!this.canAttemptOperation() || !this.isRedisAvailable) {
      this.logger.debug(`Redis zadd operation skipped (circuit breaker): ${key}`);
      return 0; // Graceful degradation
    }

    try {
      return await this.executeRedisOperation(() => 
        this.client.zadd(key, score, member)
      );
    } catch (error) {
      this.logger.debug(`Failed to zadd ${key}:`, error.message);
      return 0;
    }
  }

  async zcard(key: string): Promise<number> {
    if (!this.canAttemptOperation() || !this.isRedisAvailable) {
      this.logger.debug(`Redis zcard operation skipped (circuit breaker): ${key}`);
      return 0; // Graceful degradation
    }

    try {
      return await this.executeRedisOperation(() => this.client.zcard(key));
    } catch (error) {
      this.logger.debug(`Failed to zcard ${key}:`, error.message);
      return 0;
    }
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.canAttemptOperation() || !this.isRedisAvailable) {
      this.logger.debug(`Redis zrange operation skipped (circuit breaker): ${key}`);
      return []; // Graceful degradation
    }

    try {
      return await this.executeRedisOperation(() => 
        this.client.zrange(key, start, stop)
      );
    } catch (error) {
      this.logger.debug(`Failed to zrange ${key}:`, error.message);
      return [];
    }
  }

  async zrem(key: string, member: string): Promise<number> {
    if (!this.canAttemptOperation() || !this.isRedisAvailable) {
      this.logger.debug(`Redis zrem operation skipped (circuit breaker): ${key}`);
      return 0; // Graceful degradation
    }

    try {
      return await this.executeRedisOperation(() => 
        this.client.zrem(key, member)
      );
    } catch (error) {
      this.logger.debug(`Failed to zrem ${key}:`, error.message);
      return 0;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.canAttemptOperation() || !this.isRedisAvailable) {
      this.logger.debug(`Redis get operation skipped (circuit breaker): ${key}`);
      return null; // Graceful degradation
    }

    try {
      return await this.executeRedisOperation(() => this.client.get(key));
    } catch (error) {
      this.logger.debug(`Failed to get key ${key}:`, error.message);
      return null; // Graceful degradation
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.canAttemptOperation() || !this.isRedisAvailable) {
      this.logger.debug(`Redis expire operation skipped (circuit breaker): ${key}`);
      return false; // Graceful degradation
    }

    try {
      const result = await this.executeRedisOperation(() => 
        this.client.expire(key, seconds)
      );
      return result === 1;
    } catch (error) {
      this.logger.debug(`Failed to expire key ${key}:`, error.message);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    if (!this.canAttemptOperation() || !this.isRedisAvailable) {
      this.logger.debug(`Redis ttl operation skipped (circuit breaker): ${key}`);
      return -1; // Graceful degradation
    }

    try {
      return await this.executeRedisOperation(() => this.client.ttl(key));
    } catch (error) {
      this.logger.debug(`Failed to get TTL for key ${key}:`, error.message);
      return -1;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.canAttemptOperation() || !this.isRedisAvailable) {
      this.logger.debug(`Redis del operation skipped (circuit breaker): ${key}`);
      return; // Graceful degradation
    }

    try {
      await this.executeRedisOperation(() => this.client.del(key));
    } catch (error) {
      this.logger.debug(`Failed to delete key ${key}:`, error.message);
      // Graceful degradation - don't throw
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.canAttemptOperation() || !this.isRedisAvailable) {
      this.logger.debug(`Redis keys operation skipped (circuit breaker): ${pattern}`);
      return []; // Graceful degradation
    }

    try {
      return await this.executeRedisOperation(() => this.scanKeys(pattern));
    } catch (error) {
      this.logger.debug(`Failed to get keys with pattern ${pattern}:`, error.message);
      return [];
    }
  }

  /**
   * Use SCAN instead of KEYS for better performance and non-blocking operation
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    
    do {
      const result = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');
    
    return keys;
  }

  /**
   * Clear keys by pattern using SCAN and batch deletion with graceful degradation
   */
  private async clearKeysByPattern(pattern: string): Promise<void> {
    if (!this.canAttemptOperation() || !this.isRedisAvailable) {
      this.logger.debug(`Clear keys operation skipped (circuit breaker): ${pattern}`);
      return;
    }

    try {
      const keys = await this.scanKeys(pattern);
      
      if (keys.length > 0) {
        // Delete in batches to avoid blocking Redis
        const batchSize = 100;
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize);
          await this.executeRedisOperation(() => 
            this.client.unlink(...batch) // UNLINK is non-blocking alternative to DEL
          );
        }
      }
    } catch (error) {
      this.logger.debug(`Failed to clear keys with pattern ${pattern}:`, error.message);
    }
  }

  /**
   * Check if Redis is available and circuit breaker is closed
   */
  isAvailable(): boolean {
    return this.isRedisAvailable && this.canAttemptOperation();
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getStatus() {
    return {
      isAvailable: this.isRedisAvailable,
      circuitBreakerState: this.circuitBreakerState,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * Get Redis client for advanced operations (use with caution)
   * Only use when circuit breaker is closed
   */
  getClient(): Redis | null {
    if (!this.canAttemptOperation() || !this.isRedisAvailable) {
      this.logger.warn('⚠️ Attempted to get Redis client when circuit breaker is open');
      return null;
    }
    return this.client;
  }
}