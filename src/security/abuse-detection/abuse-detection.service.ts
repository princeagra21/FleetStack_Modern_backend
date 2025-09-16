import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

export interface AbuseAnalysis {
  isSuspicious: boolean;
  riskScore: number;
  reasons: string[];
  shouldBlock: boolean;
}

export interface SuspiciousActivity {
  timestamp: string;
  ip: string;
  userAgent: string;
  endpoint: string;
  method: string;
  userId?: number;
  riskScore: number;
  reasons: string[];
}

@Injectable()
export class AbuseDetectionService implements OnModuleDestroy {
  private readonly logger = new Logger(AbuseDetectionService.name);
  private redis: Redis;
  private isRedisAvailable = false;
  private circuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;
  private readonly circuitConfig = {
    failureThreshold: 3,    // Open after 3 failures
    resetTimeout: 30000,    // Wait 30s before retry
  };
  private shutdownPromise: Promise<void> | null = null;

  // 🚀 SECURITY FALLBACK: In-memory protection when Redis is unavailable
  private memoryBlacklist = new Set<string>();
  private memoryAuthFailures = new Map<string, { count: number; expiry: number }>();
  private memoryRequestFreq = new Map<string, { count: number; expiry: number }>();
  private readonly MEMORY_TTL = 300000; // 5 minutes in memory

  constructor() {
    this.initializeRedisClient();
  }

  private initializeRedisClient() {
    // Create resilient Redis client for abuse detection
    this.redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: 3, // Use different database for abuse detection
      keyPrefix: 'abuse:',
      // 🚀 FIXED: Removed unsupported connectTimeout and commandTimeout options
      // These options don't exist in current ioredis and could cause instability
      lazyConnect: true,             // Changed to lazy connect
      maxRetriesPerRequest: 2,       // Reduced retries
      enableOfflineQueue: false,     // Disabled to prevent hanging
      // 🚀 RESILIENT RETRY - Stop after 5 attempts
      retryStrategy: (times) => {
        if (times > 5) {
          this.logger.warn(`🔴 Abuse Detection Redis retry limit reached. Opening circuit breaker.`);
          this.openCircuit('Max retry attempts reached');
          return null;
        }
        const delay = Math.min(times * 1000, 15000); // Max 15s delay
        return delay;
      },
    });

    this.setupRedisEventHandlers();
  }

  private setupRedisEventHandlers() {
    this.redis.on('connect', () => {
      this.logger.log('✅ Abuse Detection Redis connected');
      this.isRedisAvailable = true;
      this.resetCircuit();
    });

    this.redis.on('ready', () => {
      this.isRedisAvailable = true;
    });

    this.redis.on('error', (error) => {
      this.logger.warn(`⚠️ Abuse Detection Redis error: ${error.message}`);
      this.isRedisAvailable = false;
      this.recordFailure();
    });

    this.redis.on('close', () => {
      this.isRedisAvailable = false;
    });

    this.redis.on('end', () => {
      this.isRedisAvailable = false;
    });
  }

  private recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.circuitConfig.failureThreshold) {
      this.openCircuit('Failure threshold exceeded');
    }
  }

  private openCircuit(reason: string) {
    if (this.circuitState !== 'OPEN') {
      this.circuitState = 'OPEN';
      this.nextAttemptTime = Date.now() + this.circuitConfig.resetTimeout;
      this.logger.warn(`🔴 Abuse Detection Circuit OPEN: ${reason}`);
    }
  }

  private resetCircuit() {
    if (this.circuitState !== 'CLOSED') {
      this.circuitState = 'CLOSED';
      this.failureCount = 0;
      this.logger.log('✅ Abuse Detection Circuit RESET');
    }
  }

  private canAttempt(): boolean {
    const now = Date.now();

    switch (this.circuitState) {
      case 'CLOSED':
        return true;
      case 'OPEN':
        if (now >= this.nextAttemptTime) {
          this.circuitState = 'HALF_OPEN';
          return true;
        }
        return false;
      case 'HALF_OPEN':
        return true;
      default:
        return false;
    }
  }

  async onModuleDestroy() {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.shutdownPromise = new Promise(async (resolve) => {
      try {
        if (this.redis) {
          try {
            if (this.redis.status === 'ready') {
              await this.redis.quit();
            } else {
              this.redis.disconnect(false);
            }
          } catch (e) {
            try { this.redis.disconnect(false); } catch { }
          }
        }
        this.logger.log('✅ Abuse Detection Redis shutdown complete');
      } catch (error) {
        this.logger.warn('❌ Abuse Detection Redis shutdown error:', error);
      }
      resolve();
    });

    return this.shutdownPromise;
  }

  async analyzeRequest(req: any): Promise<AbuseAnalysis> {
    const reasons: string[] = [];
    let riskScore = 0;

    try {
      // Check 1: Rapid successive requests
      const requestFrequency = await this.checkRequestFrequency(req.ip);
      if (requestFrequency > 20) {
        reasons.push('Excessive request frequency detected');
        riskScore += 40;
      }

      // Check 2: Suspicious User-Agent patterns
      const userAgent = req.headers?.['user-agent'] || req.headers?.userAgent || '';
      if (this.isSuspiciousUserAgent(userAgent)) {
        reasons.push('Suspicious user agent detected');
        riskScore += 30;
      }

      // Check 3: Failed authentication attempts
      const authFailures = await this.getAuthFailureCount(req.ip);
      if (authFailures > 5) {
        reasons.push('Multiple authentication failures');
        riskScore += 50;
      }

      // Check 4: Endpoint scanning behavior
      const endpointDiversity = await this.checkEndpointScanning(req.ip);
      if (endpointDiversity > 15) {
        reasons.push('Potential endpoint scanning detected');
        riskScore += 35;
      }

      // Check 5: Suspicious request patterns
      const suspiciousPatterns = this.checkSuspiciousPatterns(req);
      if (suspiciousPatterns.length > 0) {
        reasons.push(...suspiciousPatterns);
        riskScore += suspiciousPatterns.length * 15;
      }

      // Check 6: Check if IP is blacklisted
      const isBlacklisted = await this.isIPBlacklisted(req.ip);
      if (isBlacklisted) {
        reasons.push('IP address is blacklisted');
        riskScore += 100; // Immediate block
      }

      const isSuspicious = riskScore >= 50;
      const shouldBlock = riskScore >= 80;

      // Log suspicious activity
      if (isSuspicious) {
        await this.recordSuspiciousActivity(req, { isSuspicious, riskScore, reasons, shouldBlock });
      }

      return {
        isSuspicious,
        riskScore,
        reasons,
        shouldBlock,
      };
    } catch (error) {
      this.logger.error('Error analyzing request for abuse:', error);
      return {
        isSuspicious: false,
        riskScore: 0,
        reasons: [],
        shouldBlock: false,
      };
    }
  }

  private async checkRequestFrequency(ip: string): Promise<number> {
    // 🚀 SECURITY FALLBACK: Use in-memory tracking when Redis unavailable
    if (!this.canAttempt() || !this.isRedisAvailable) {
      const now = Date.now();
      const memoryRecord = this.memoryRequestFreq.get(ip);

      if (!memoryRecord || memoryRecord.expiry <= now) {
        // New or expired record
        this.memoryRequestFreq.set(ip, { count: 1, expiry: now + 1000 }); // 1 second window
        return 1;
      } else {
        // Increment existing record
        memoryRecord.count++;
        return memoryRecord.count;
      }
    }

    try {
      const key = `freq:${ip}`;
      const current = await this.redis.incr(key);
      if (current === 1) {
        await this.redis.expire(key, 1); // 1 second window
      }

      // Success - reset circuit if half-open
      if (this.circuitState === 'HALF_OPEN') {
        this.resetCircuit();
      }

      return current;
    } catch (error) {
      this.recordFailure();
      // Fallback to memory tracking
      const now = Date.now();
      const memoryRecord = this.memoryRequestFreq.get(ip);

      if (!memoryRecord || memoryRecord.expiry <= now) {
        this.memoryRequestFreq.set(ip, { count: 1, expiry: now + 1000 });
        return 1;
      } else {
        memoryRecord.count++;
        return memoryRecord.count;
      }
    }
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /curl/i,
      /wget/i,
      /python-urllib/i,
      /python-requests/i,
      /bot(?!.*google|.*bing|.*facebook)/i,
      /crawler/i,
      /scanner/i,
      /exploit/i,
      /hack/i,
      /penetration/i,
      /nikto/i,
      /sqlmap/i,
      /nmap/i,
      /burp/i,
      /zap/i,
    ];

    // Also check for completely missing or very short user agents
    if (!userAgent || userAgent.length < 10) {
      return true;
    }

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  private async getAuthFailureCount(ip: string): Promise<number> {
    // 🚀 SECURITY FALLBACK: Use in-memory tracking when Redis unavailable
    if (!this.canAttempt() || !this.isRedisAvailable) {
      const memoryRecord = this.memoryAuthFailures.get(ip);
      if (memoryRecord && memoryRecord.expiry > Date.now()) {
        return memoryRecord.count;
      }
      this.memoryAuthFailures.delete(ip); // Expired
      return 0;
    }

    try {
      const key = `auth_failures:${ip}`;
      const failures = await this.redis.get(key);

      // Success - reset circuit if half-open
      if (this.circuitState === 'HALF_OPEN') {
        this.resetCircuit();
      }

      return parseInt(failures || '0');
    } catch (error) {
      this.recordFailure();
      // Fallback to memory
      const memoryRecord = this.memoryAuthFailures.get(ip);
      if (memoryRecord && memoryRecord.expiry > Date.now()) {
        return memoryRecord.count;
      }
      this.memoryAuthFailures.delete(ip); // Expired
      return 0;
    }
  }

  private async checkEndpointScanning(ip: string): Promise<number> {
    // 🚀 GRACEFUL DEGRADATION: Return 0 if Redis unavailable (allows requests)
    if (!this.canAttempt() || !this.isRedisAvailable) {
      return 0; // Fail-open for availability
    }

    try {
      const key = `endpoints:${ip}`;
      const count = await this.redis.scard(key);

      // Success - reset circuit if half-open
      if (this.circuitState === 'HALF_OPEN') {
        this.resetCircuit();
      }

      return count;
    } catch (error) {
      this.recordFailure();
      return 0; // Graceful degradation
    }
  }

  private checkSuspiciousPatterns(req: any): string[] {
    const reasons: string[] = [];
    const url = req.url || '';
    const body = req.body || {};
    const query = req.query || {};

    // Check for SQL injection attempts
    const sqlInjectionPatterns = [
      /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
      /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
      /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
      /((\%27)|(\'))union/i,
      /exec(\s|\+)+(s|x)p\w+/i,
    ];

    if (sqlInjectionPatterns.some(pattern => pattern.test(url))) {
      reasons.push('SQL injection attempt detected in URL');
    }

    // Check for XSS attempts
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /eval\s*\(/i,
      /expression\s*\(/i,
    ];

    if (xssPatterns.some(pattern => pattern.test(url) || pattern.test(JSON.stringify(body)))) {
      reasons.push('XSS attempt detected');
    }

    // Check for path traversal attempts
    const pathTraversalPatterns = [
      /\.\.[\/\\]/,
      /%2e%2e[\/\\]/i,
      /\.\.%2f/i,
      /\.\.%5c/i,
    ];

    if (pathTraversalPatterns.some(pattern => pattern.test(url))) {
      reasons.push('Path traversal attempt detected');
    }

    // Check for command injection attempts
    const commandInjectionPatterns = [
      /[;&|`]/,
      /\$\(/,
      /`.*`/,
      />\s*\/dev\/null/,
      /wget\s+/i,
      /curl\s+/i,
    ];

    if (commandInjectionPatterns.some(pattern => pattern.test(url) || pattern.test(JSON.stringify(body)))) {
      reasons.push('Command injection attempt detected');
    }

    return reasons;
  }

  async isIPBlacklisted(ip: string): Promise<boolean> {
    // 🚀 SECURITY FALLBACK: Check in-memory blacklist when Redis unavailable
    if (!this.canAttempt() || !this.isRedisAvailable) {
      const inMemoryBlacklisted = this.memoryBlacklist.has(ip);
      if (inMemoryBlacklisted) {
        this.logger.warn(`⚠️ IP ${ip} blocked by in-memory blacklist (Redis unavailable)`);
      }
      return inMemoryBlacklisted;
    }

    try {
      const blacklisted = await this.redis.sismember('blacklisted_ips', ip);

      // Success - reset circuit if half-open
      if (this.circuitState === 'HALF_OPEN') {
        this.resetCircuit();
      }

      return !!blacklisted;
    } catch (error) {
      this.recordFailure();
      // Fallback to in-memory blacklist
      const inMemoryBlacklisted = this.memoryBlacklist.has(ip);
      if (inMemoryBlacklisted) {
        this.logger.warn(`⚠️ IP ${ip} blocked by in-memory blacklist (Redis error)`);
      }
      return inMemoryBlacklisted;
    }
  }

  async recordSuspiciousActivity(req: any, analysis: AbuseAnalysis): Promise<void> {
    const record: SuspiciousActivity = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers?.['user-agent'] || req.headers?.userAgent || 'unknown',
      endpoint: req.url,
      method: req.method,
      userId: req.user?.id,
      riskScore: analysis.riskScore,
      reasons: analysis.reasons,
    };

    // Always log suspicious activity even if Redis is down
    this.logger.warn('Suspicious activity detected', {
      ip: req.ip,
      endpoint: req.url,
      riskScore: analysis.riskScore,
      reasons: analysis.reasons,
    });

    // Try to store in Redis if available (non-blocking)
    if (this.canAttempt() && this.isRedisAvailable) {
      try {
        // Store in Redis for immediate use
        await this.redis.lpush('suspicious_activity', JSON.stringify(record));
        await this.redis.ltrim('suspicious_activity', 0, 1000); // Keep last 1000 records

        // Track endpoint scanning
        if (req.url) {
          await this.redis.sadd(`endpoints:${req.ip}`, req.url);
          await this.redis.expire(`endpoints:${req.ip}`, 3600); // 1 hour
        }

        // Success - reset circuit if half-open
        if (this.circuitState === 'HALF_OPEN') {
          this.resetCircuit();
        }
      } catch (error) {
        this.logger.debug(`Failed to record suspicious activity in Redis: ${error.message}`);
        this.recordFailure();
      }
    } else {
      this.logger.debug('Suspicious activity not cached - Redis unavailable');
    }

    // Auto-blacklist IPs with very high risk scores (attempts even if circuit is open)
    if (analysis.riskScore >= 100) {
      await this.blacklistIP(req.ip, 'Automatic blacklist due to high risk score');
    }
  }

  async recordAuthFailure(ip: string): Promise<void> {
    let failures = 1;

    // 🚀 SECURITY FALLBACK: Always track auth failures in memory
    const now = Date.now();
    const expiry = now + 3600000; // 1 hour
    const memoryRecord = this.memoryAuthFailures.get(ip);

    if (memoryRecord && memoryRecord.expiry > now) {
      memoryRecord.count++;
      failures = memoryRecord.count;
    } else {
      this.memoryAuthFailures.set(ip, { count: 1, expiry });
    }

    this.logger.warn(`⚠️ Auth failure recorded for ${ip} (count: ${failures})`);

    // Try to also record in Redis if available
    if (this.canAttempt() && this.isRedisAvailable) {
      try {
        const key = `auth_failures:${ip}`;
        const redisFailures = await this.redis.incr(key);
        await this.redis.expire(key, 3600); // 1 hour

        // Success - reset circuit if half-open and sync with Redis count
        if (this.circuitState === 'HALF_OPEN') {
          this.resetCircuit();
        }

        failures = Math.max(failures, redisFailures); // Use higher count
      } catch (error) {
        this.recordFailure();
        this.logger.warn(`Failed to record auth failure in Redis for ${ip}: ${error.message}`);
        // Continue with memory-only tracking
      }
    }

    // Auto-blacklist after too many failures (using memory or Redis count)
    if (failures >= 10) {
      await this.blacklistIP(ip, 'Too many authentication failures');
    }
  }

  async blacklistIP(ip: string, reason: string): Promise<void> {
    // 🚀 SECURITY FALLBACK: Always add to in-memory blacklist for immediate protection
    this.memoryBlacklist.add(ip);
    this.logger.error(`🔴 IP ${ip} blacklisted in memory: ${reason}`);

    // Try to also blacklist in Redis if available
    if (!this.canAttempt() || !this.isRedisAvailable) {
      this.logger.warn(`⚠️ IP ${ip} blacklisted in memory only - Redis unavailable: ${reason}`);
      return;
    }

    try {
      await this.redis.sadd('blacklisted_ips', ip);
      await this.redis.hset('blacklist_reasons', ip, reason);
      await this.redis.hset('blacklist_timestamps', ip, new Date().toISOString());

      // Success - reset circuit if half-open
      if (this.circuitState === 'HALF_OPEN') {
        this.resetCircuit();
      }

      this.logger.error(`🔴 IP ${ip} blacklisted in Redis: ${reason}`);
    } catch (error) {
      this.logger.error(`🚨 SECURITY: Failed to blacklist ${ip} in Redis, but protected in memory: ${error.message}`);
      this.recordFailure();
    }
  }

  async whitelistIP(ip: string): Promise<void> {
    // 🚀 GRACEFUL DEGRADATION: Warn if Redis unavailable
    if (!this.canAttempt() || !this.isRedisAvailable) {
      this.logger.warn(`⚠️ Cannot whitelist ${ip} - Redis unavailable`);
      return;
    }

    try {
      await this.redis.srem('blacklisted_ips', ip);
      await this.redis.hdel('blacklist_reasons', ip);
      await this.redis.hdel('blacklist_timestamps', ip);

      // Success - reset circuit if half-open
      if (this.circuitState === 'HALF_OPEN') {
        this.resetCircuit();
      }

      this.logger.log(`IP ${ip} has been removed from blacklist`);
    } catch (error) {
      this.recordFailure();
      this.logger.error(`Failed to whitelist ${ip}: ${error.message}`);
    }
  }

  async getSuspiciousActivity(limit = 100): Promise<SuspiciousActivity[]> {
    // 🚀 GRACEFUL DEGRADATION: Return empty array if Redis unavailable
    if (!this.canAttempt() || !this.isRedisAvailable) {
      this.logger.debug('Suspicious activity query skipped - Redis unavailable');
      return [];
    }

    try {
      const records = await this.redis.lrange('suspicious_activity', 0, limit - 1);

      // Success - reset circuit if half-open
      if (this.circuitState === 'HALF_OPEN') {
        this.resetCircuit();
      }

      return records.map(record => JSON.parse(record));
    } catch (error) {
      this.recordFailure();
      this.logger.warn(`Failed to get suspicious activity: ${error.message}`);
      return [];
    }
  }

  async getBlacklistedIPs(): Promise<string[]> {
    // 🚀 GRACEFUL DEGRADATION: Return empty array if Redis unavailable
    if (!this.canAttempt() || !this.isRedisAvailable) {
      this.logger.debug('Blacklisted IPs query skipped - Redis unavailable');
      return [];
    }

    try {
      const ips = await this.redis.smembers('blacklisted_ips');

      // Success - reset circuit if half-open
      if (this.circuitState === 'HALF_OPEN') {
        this.resetCircuit();
      }

      return ips;
    } catch (error) {
      this.recordFailure();
      this.logger.warn(`Failed to get blacklisted IPs: ${error.message}`);
      return [];
    }
  }
}