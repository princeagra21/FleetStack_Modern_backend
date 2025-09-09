import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

@Injectable()
export class SecurityGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<FastifyRequest>();

        this.setSecurityHeaders(request);
        this.validateRequest(request);

        return true;
    }

    private setSecurityHeaders(request: FastifyRequest): void {
        // Security headers are handled by Helmet.js in main.ts
        // This guard focuses on request validation
    }

    private validateRequest(request: FastifyRequest): void {
        const { headers, url } = request;

        if (this.isSuspiciousRequest(headers, url)) {
            throw new Error('Suspicious request detected');
        }
    }

    private isSuspiciousRequest(headers: any, url: string): boolean {
        const suspiciousPatterns = [
            /\.\./,  // Directory traversal
            /<script/i,  // XSS attempts
            /union.*select/i,  // SQL injection
            /javascript:/i,  // JavaScript protocol
        ];

        return suspiciousPatterns.some(pattern => pattern.test(url));
    }
}
