import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
    use(req: FastifyRequest, res: FastifyReply, next: () => void) {
        this.setSecurityHeaders(res);
        this.rateLimitCheck(req);
        next();
    }

    private setSecurityHeaders(res: FastifyReply): void {
        res.header('X-Content-Type-Options', 'nosniff');
        res.header('X-Frame-Options', 'DENY');
        res.header('X-XSS-Protection', '1; mode=block');
        res.header('Referrer-Policy', 'same-origin');
        res.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    private rateLimitCheck(req: FastifyRequest): void {
        const clientIP = req.ip;
        const userAgent = req.headers['user-agent'] || '';

        if (this.isBlockedIP(clientIP) || this.isSuspiciousUserAgent(userAgent)) {
            throw new Error('Request blocked by security middleware');
        }
    }

    private isBlockedIP(ip: string): boolean {
        const blockedIPs = ['127.0.0.1']; // Add blocked IPs here
        return blockedIPs.includes(ip);
    }

    private isSuspiciousUserAgent(userAgent: string): boolean {
        const suspiciousAgents = ['bot', 'crawler', 'scanner'];
        return suspiciousAgents.some(agent =>
            userAgent?.toLowerCase().includes(agent)
        );
    }
}
