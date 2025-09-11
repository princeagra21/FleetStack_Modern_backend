import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { 
  RequestWithClientIP, 
  TrustedProxyConfig, 
  ClientIPExtractionResult 
} from '../interfaces/security.interfaces';

@Injectable()
export class IPExtractionService {
  private readonly logger = new Logger(IPExtractionService.name);
  private readonly trustedProxyConfig: TrustedProxyConfig;

  constructor(private readonly configService: ConfigService) {
    this.trustedProxyConfig = {
      trustedProxies: this.configService.get('TRUSTED_PROXIES', '').split(',').filter(Boolean),
      trustCloudflare: this.configService.get('TRUST_CLOUDFLARE', 'true') === 'true',
      trustCloudfront: this.configService.get('TRUST_CLOUDFRONT', 'true') === 'true',
      maxHops: parseInt(this.configService.get('MAX_PROXY_HOPS', '3'), 10),
    };
  }

  extractClientIP(req: Request): ClientIPExtractionResult {
    // Priority order for IP extraction with security validation
    
    // 1. Cloudflare (highest priority if trusted)
    if (this.trustedProxyConfig.trustCloudflare && req.headers['cf-connecting-ip']) {
      const ip = req.headers['cf-connecting-ip'] as string;
      if (this.isValidIP(ip)) {
        return { ip, source: 'cf-connecting-ip', trusted: true };
      }
    }

    // 2. X-Real-IP (common nginx/load balancer header)
    if (req.headers['x-real-ip']) {
      const ip = req.headers['x-real-ip'] as string;
      if (this.isValidIP(ip) && this.isTrustedProxy(req.ip || '')) {
        return { ip, source: 'x-real-ip', trusted: true };
      }
    }

    // 3. X-Forwarded-For (validate proxy chain)
    if (req.headers['x-forwarded-for']) {
      const forwardedIPs = (req.headers['x-forwarded-for'] as string)
        .split(',')
        .map(ip => ip.trim())
        .filter(ip => this.isValidIP(ip));
      
      if (forwardedIPs.length > 0 && forwardedIPs.length <= this.trustedProxyConfig.maxHops) {
        const clientIP = forwardedIPs[0];
        const trusted = this.validateProxyChain(forwardedIPs, req.ip || '');
        return { ip: clientIP, source: 'x-forwarded-for', trusted };
      }
    }

    // 4. X-Client-IP (fallback)
    if (req.headers['x-client-ip']) {
      const ip = req.headers['x-client-ip'] as string;
      if (this.isValidIP(ip)) {
        return { ip, source: 'x-client-ip', trusted: false };
      }
    }

    // 5. Direct connection IP (fallback)
    const directIP = req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || 'unknown';
    return { 
      ip: directIP, 
      source: 'direct', 
      trusted: true 
    };
  }

  attachClientIP(req: Request): RequestWithClientIP {
    const extraction = this.extractClientIP(req);
    const requestWithIP = req as RequestWithClientIP;
    requestWithIP.clientIP = extraction.ip;
    
    // Log suspicious IP extraction scenarios
    if (!extraction.trusted) {
      this.logger.warn(`Untrusted IP source detected`, {
        extractedIP: extraction.ip,
        source: extraction.source,
        directIP: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
      });
    }
    
    return requestWithIP;
  }

  private isValidIP(ip: string): boolean {
    // IPv4 validation
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    // IPv6 validation (basic)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
    
    // Check for private/internal IPs that shouldn't be external
    const privateIPRegex = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.|169\.254\.|::1|fc00:|fe80:)/;
    
    if (!ip || ip === 'unknown') return false;
    
    const isValidFormat = ipv4Regex.test(ip) || ipv6Regex.test(ip);
    const isPublic = !privateIPRegex.test(ip);
    
    return isValidFormat && isPublic;
  }

  private isTrustedProxy(proxyIP: string): boolean {
    // Check if the immediate proxy is in our trusted list
    if (this.trustedProxyConfig.trustedProxies.includes(proxyIP)) {
      return true;
    }
    
    // Check common cloud provider IP ranges (simplified)
    const cloudProviderRanges = [
      /^52\./,     // AWS
      /^54\./,     // AWS
      /^34\./,     // Google Cloud
      /^35\./,     // Google Cloud
      /^13\./,     // Azure
      /^40\./,     // Azure
    ];
    
    return cloudProviderRanges.some(range => range.test(proxyIP));
  }

  private validateProxyChain(forwardedIPs: string[], directIP: string): boolean {
    // Validate that the proxy chain makes sense
    // The last IP in the chain should match our direct connection
    if (forwardedIPs.length > 1) {
      const lastProxy = forwardedIPs[forwardedIPs.length - 1];
      if (lastProxy !== directIP && !this.isTrustedProxy(directIP)) {
        this.logger.warn('Proxy chain validation failed', {
          forwardedIPs,
          directIP,
          lastProxy,
        });
        return false;
      }
    }
    
    // Check for obvious proxy chain manipulation
    const uniqueIPs = new Set(forwardedIPs);
    if (uniqueIPs.size !== forwardedIPs.length) {
      this.logger.warn('Duplicate IPs in proxy chain detected', { forwardedIPs });
      return false;
    }
    
    return true;
  }

  isWhitelistedIP(ip: string): boolean {
    const whitelist = this.configService.get('IP_WHITELIST', '').split(',').filter(Boolean);
    return whitelist.includes(ip) || this.isLocalIP(ip);
  }

  private isLocalIP(ip: string): boolean {
    const localIPs = ['127.0.0.1', '::1', 'localhost'];
    return localIPs.includes(ip);
  }

  getTrustedProxyConfig(): TrustedProxyConfig {
    return { ...this.trustedProxyConfig };
  }
}