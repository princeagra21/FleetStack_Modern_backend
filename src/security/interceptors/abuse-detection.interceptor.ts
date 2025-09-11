import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AbuseDetectionService } from '../abuse-detection/abuse-detection.service';
import { RateLimitService } from '../services/rate-limit.service';
import { IPExtractionService } from '../services/ip-extraction.service';
import { SecurityMetricsService } from '../services/metrics.service';
import { RequestWithClientIP } from '../interfaces/security.interfaces';

@Injectable()
export class AbuseDetectionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AbuseDetectionInterceptor.name);

  constructor(
    private readonly abuseDetectionService: AbuseDetectionService,
    private readonly rateLimitService: RateLimitService,
    private readonly ipExtractionService: IPExtractionService,
    private readonly metricsService: SecurityMetricsService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const startTime = Date.now();
    const req = context.switchToHttp().getRequest();
    
    // Extract and attach client IP using enterprise-grade service
    const requestWithIP = this.ipExtractionService.attachClientIP(req);
    const clientIP = requestWithIP.clientIP;
    
    // Skip all checks for whitelisted IPs
    if (this.ipExtractionService.isWhitelistedIP(clientIP)) {
      return next.handle();
    }

    try {
      // 1. Check rate limits first (before expensive analysis)
      const rateLimitResult = await this.checkRateLimit(requestWithIP, clientIP);
      if (!rateLimitResult.allowed) {
        this.metricsService.incrementRateLimitHits();
        this.logger.warn(`Rate limit exceeded for ${clientIP}: ${rateLimitResult.totalHits} requests (limit exceeded)`);
        throw new HttpException(
          `Rate limit exceeded. Try again in ${Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)} seconds`,
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      // 2. Check if IP is blacklisted 
      const isBlacklisted = await this.abuseDetectionService.isIPBlacklisted(clientIP);
      if (isBlacklisted) {
        this.metricsService.incrementBlacklistBlocks();
        this.logger.error(`Blocking blacklisted IP: ${clientIP}`);
        throw new ForbiddenException('Access denied - IP address is blacklisted');
      }

      // 3. Analyze request for suspicious patterns
      const analysis = await this.abuseDetectionService.analyzeRequest({
        ...requestWithIP,
        ip: clientIP, // Use extracted client IP for analysis
      });
      
      // Block if high risk
      if (analysis.shouldBlock) {
        this.metricsService.incrementSuspiciousRequests();
        this.logger.error(`Blocking request due to high risk score: ${analysis.riskScore}`, {
          ip: clientIP,
          endpoint: req.url,
          reasons: analysis.reasons,
        });
        
        throw new ForbiddenException('Access denied due to suspicious activity');
      }

      // Log suspicious activity for monitoring
      if (analysis.isSuspicious) {
        this.metricsService.incrementSuspiciousRequests();
        this.logger.warn('Suspicious activity detected', {
          ip: clientIP,
          endpoint: req.url,
          riskScore: analysis.riskScore,
          reasons: analysis.reasons,
        });
      }

      // Record analysis performance
      const analysisTime = Date.now() - startTime;
      this.metricsService.recordAnalysisLatency(analysisTime);

    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof HttpException) {
        throw error; // Re-throw security exceptions
      }
      this.logger.error('Error in security check:', error);
      // Don't block on detection errors, just log
    }

    return next.handle().pipe(
      tap({
        next: () => {
          // Record successful request patterns
        },
        error: (error) => {
          // Record failed requests for pattern analysis
          if (error.status === 401 || error.status === 403) {
            this.abuseDetectionService.recordAuthFailure(clientIP);
          }
        },
      }),
      catchError((error) => {
        // Log rate limiting events
        if (error instanceof HttpException && error.getStatus() === 429) {
          this.logger.warn('Rate limit exceeded', {
            ip: clientIP,
            endpoint: req.url,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString(),
          });
        }
        throw error; // Re-throw all errors with proper status codes
      }),
    );
  }

  private isWhitelistedIP(ip: string): boolean {
    const whitelist = process.env.IP_WHITELIST?.split(',') || [];
    return whitelist.includes(ip);
  }

  private getClientIP(req: any): string {
    // Handle proxy/load balancer IPs
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      // X-Forwarded-For can be "client, proxy1, proxy2"
      const ips = forwarded.split(',').map(ip => ip.trim());
      return ips[0]; // First IP is the original client
    }
    
    // Fallback to other headers
    return req.headers['x-real-ip'] || 
           req.headers['x-client-ip'] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           req.ip;
  }

  private async checkRateLimit(req: RequestWithClientIP, clientIP: string): Promise<{ allowed: boolean; remaining: number; resetTime: number; totalHits: number }> {
    const routeKey = `${req.method}:${req.route?.path || req.url}`;
    const limits = this.getRateLimits(req.method, req.url);
    
    if (!limits) {
      // No rate limit for this endpoint - allow all requests
      return {
        allowed: true,
        remaining: 999999,
        resetTime: Date.now() + 60000,
        totalHits: 0,
      };
    }

    try {
      // Use the dedicated RateLimitService for proper encapsulation
      const result = await this.rateLimitService.checkRateLimit(clientIP, routeKey, limits);
      return result;
      
    } catch (error) {
      this.metricsService.incrementRedisErrors();
      this.logger.error('Error checking rate limit:', error);
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        remaining: limits.maxRequests,
        resetTime: Date.now() + (limits.windowSeconds * 1000),
        totalHits: 0,
      };
    }
  }

  private getRateLimits(method: string, url: string): { maxRequests: number; windowSeconds: number } | null {
    // Define endpoint-specific rate limits
    const endpoint = `${method}:${url}`;
    
    // Auth endpoints (most restrictive)
    if (endpoint === 'POST:/auth/login') {
      return { maxRequests: 5, windowSeconds: 300 }; // 5 per 5 minutes
    }
    if (endpoint === 'POST:/auth/signup') {
      return { maxRequests: 3, windowSeconds: 3600 }; // 3 per hour
    }
    if (endpoint === 'POST:/auth/refresh') {
      return { maxRequests: 10, windowSeconds: 60 }; // 10 per minute
    }
    
    // Admin/Security endpoints
    if (url.startsWith('/security/')) {
      return { maxRequests: 10, windowSeconds: 60 }; // 10 per minute
    }
    
    // Redis operations (admin only)
    if (url.startsWith('/redis/')) {
      return { maxRequests: 20, windowSeconds: 60 }; // 20 per minute
    }
    
    // Default rate limit for all other endpoints
    return { maxRequests: 100, windowSeconds: 60 }; // 100 per minute
  }
}