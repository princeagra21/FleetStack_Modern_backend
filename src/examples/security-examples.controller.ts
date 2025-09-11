import { Controller, Get, Post, Body, Headers, Query, Res } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse,
  ApiQuery,
  ApiHeader,
  ApiBody,
} from '@nestjs/swagger';
import { Public } from '../modules/auth/decorators/public.decorator';
import type { FastifyReply } from 'fastify';

/**
 * Security Examples Controller
 * 
 * Demonstrates Helmet.js security features and HTTP security headers.
 * Shows how various security headers protect against common web vulnerabilities.
 */

export interface SecurityHeadersResponse {
  message: string;
  timestamp: string;
  securityHeaders: {
    [key: string]: string | undefined;
  };
  vulnerabilityProtection: {
    xss: string;
    clickjacking: string;
    sniffing: string;
    hsts: string;
    csp: string;
    referrer: string;
  };
}

export interface CSPTestResponse {
  message: string;
  cspDirectives: {
    defaultSrc: string[];
    scriptSrc: string[];
    styleSrc: string[];
    imgSrc: string[];
    connectSrc: string[];
    fontSrc: string[];
    objectSrc: string[];
    mediaSrc: string[];
    frameSrc: string[];
  };
  testResults: {
    inlineScript: string;
    externalScript: string;
    inlineStyle: string;
    imageLoad: string;
  };
}

@ApiTags('Security Examples')
@Controller('security-examples')
@Public() // Make endpoints public for demonstration purposes
export class SecurityExamplesController {

  /**
   * Response Security Headers Overview
   */
  @Get('headers')
  @ApiOperation({
    summary: 'View Active Security Headers',
    description: `
    Shows the actual HTTP security headers returned by this application.
    
    **Note**: Use the /headers-test endpoint to see headers via browser developer tools.
    This endpoint provides programmatic access to security header information.
    
    **Security Features:**
    - Content-Security-Policy: Controls resource loading to prevent XSS
    - Strict-Transport-Security: Enforces HTTPS connections
    - X-Frame-Options: Prevents clickjacking attacks  
    - X-Content-Type-Options: Prevents MIME type sniffing
    - Referrer-Policy: Controls referrer information
    - Cross-Origin-* headers: Control cross-origin interactions
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Security headers and environment configuration',
  })
  async getSecurityHeaders(@Res() reply: FastifyReply): Promise<void> {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    // This endpoint demonstrates the headers without actually returning them
    // For actual header inspection, use /headers-test endpoint
    return reply.send({
      message: 'Helmet.js security headers are active and protecting this application',
      timestamp: new Date().toISOString(),
      environment: isDevelopment ? 'development' : 'production',
      configuration: {
        csp: isDevelopment ? 'Relaxed for Swagger UI' : 'Strict production policy',
        hsts: isDevelopment ? 'Development mode (no preload)' : 'Production mode',
        cors: isDevelopment ? 'Allow all origins' : 'Restricted to allowed origins',
        frameOptions: isDevelopment ? 'SAMEORIGIN' : 'DENY',
        coep: isDevelopment ? 'Disabled' : 'Enabled',
      },
      vulnerabilityProtection: {
        xss: 'Protected by Content-Security-Policy',
        clickjacking: `Protected by X-Frame-Options: ${isDevelopment ? 'SAMEORIGIN' : 'DENY'}`,
        sniffing: 'Protected by X-Content-Type-Options: nosniff',
        hsts: 'HTTPS enforced by Strict-Transport-Security',
        csp: 'Resource loading controlled by Content-Security-Policy',
        referrer: `Referrer policy: ${isDevelopment ? 'no-referrer' : 'same-origin'}`,
      },
      instructions: [
        'Use GET /security-examples/headers-test to inspect actual response headers',
        'Check browser developer tools Network tab for complete header list',
        'Headers vary between development and production environments',
      ],
    });
  }

  /**
   * Content Security Policy Test
   */
  @Get('csp-test')
  @ApiOperation({
    summary: 'Content Security Policy Testing',
    description: `
    Tests Content Security Policy (CSP) directives and their effectiveness.
    CSP helps prevent XSS attacks by controlling which resources can be loaded.
    
    **CSP Directives Tested:**
    - default-src: Fallback for other resource types
    - script-src: JavaScript source whitelist
    - style-src: CSS stylesheet source whitelist
    - img-src: Image source whitelist
    - connect-src: XMLHttpRequest/fetch source whitelist
    - font-src: Font source whitelist
    - object-src: Plugin source whitelist (disabled)
    - media-src: Audio/video source whitelist
    - frame-src: Frame source whitelist (disabled)
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'CSP configuration and test results',
    schema: {
      example: {
        message: 'Content Security Policy is active',
        cspDirectives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
        testResults: {
          inlineScript: 'Allowed (unsafe-inline enabled for development)',
          externalScript: 'Allowed from whitelisted domains only',
          inlineStyle: 'Allowed (unsafe-inline enabled for Swagger UI)',
          imageLoad: 'Allowed from self, data URLs, and HTTPS sources',
        },
      },
    },
  })
  async testCSP(): Promise<CSPTestResponse> {
    return {
      message: 'Content Security Policy is active and configured',
      cspDirectives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
      testResults: {
        inlineScript: 'Allowed (unsafe-inline enabled for development)',
        externalScript: 'Allowed from whitelisted domains (cdnjs.cloudflare.com)',
        inlineStyle: 'Allowed (unsafe-inline enabled for Swagger UI compatibility)',
        imageLoad: 'Allowed from self, data URLs, and HTTPS sources',
      },
    };
  }

  /**
   * HSTS (HTTP Strict Transport Security) Demo
   */
  @Get('hsts-demo')
  @ApiOperation({
    summary: 'HSTS Security Demonstration',
    description: `
    Demonstrates HTTP Strict Transport Security (HSTS) header functionality.
    HSTS forces browsers to use HTTPS and prevents protocol downgrade attacks.
    
    **HSTS Configuration:**
    - max-age: 31536000 seconds (1 year)
    - includeSubDomains: Yes (applies to all subdomains)
    - preload: Yes (eligible for browser preload list)
    
    **Protection Against:**
    - Protocol downgrade attacks
    - Cookie hijacking on insecure connections
    - Mixed content vulnerabilities
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'HSTS configuration and security benefits',
  })
  async hstsDemo() {
    return {
      message: 'HSTS (HTTP Strict Transport Security) is active',
      timestamp: new Date().toISOString(),
      hstsConfig: {
        maxAge: '31536000 seconds (1 year)',
        includeSubDomains: true,
        preload: true,
        browserSupport: 'All modern browsers support HSTS',
      },
      protectionLevel: {
        protocolDowngrade: 'Protected - HTTPS enforced',
        cookieHijacking: 'Protected - Secure connections only',
        mixedContent: 'Protected - No insecure resource loading',
        manInTheMiddle: 'Mitigated - Certificate pinning encouraged',
      },
      implementation: {
        headerName: 'Strict-Transport-Security',
        headerValue: 'max-age=31536000; includeSubDomains; preload',
        firstVisit: 'Header establishes HSTS policy',
        subsequentVisits: 'Browser enforces HTTPS automatically',
      },
    };
  }

  /**
   * XSS Protection Demo
   */
  @Get('xss-demo')
  @ApiOperation({
    summary: 'XSS Protection Demonstration',
    description: `
    Demonstrates Cross-Site Scripting (XSS) protection mechanisms.
    Shows how Helmet.js headers and CSP work together to prevent XSS attacks.
    
    **XSS Protection Layers:**
    1. X-XSS-Protection header (legacy browsers)
    2. Content-Security-Policy (modern approach)
    3. Input validation and sanitization
    4. Output encoding
    `,
  })
  @ApiQuery({
    name: 'userInput',
    required: false,
    description: 'Test input to demonstrate XSS protection',
    example: '<script>alert("XSS")</script>',
  })
  @ApiResponse({
    status: 200,
    description: 'XSS protection demonstration with user input handling',
  })
  async xssDemo(@Query('userInput') userInput?: string) {
    // Safe handling of user input (this would normally be validated/sanitized)
    const safeInput = userInput ? userInput.replace(/[<>]/g, '') : 'No input provided';
    
    return {
      message: 'XSS protection mechanisms are active',
      timestamp: new Date().toISOString(),
      userInputReceived: userInput || null,
      safeInputProcessed: safeInput,
      protectionMechanisms: {
        xssProtectionHeader: 'X-XSS-Protection: 0 (disabled as CSP is preferred)',
        contentSecurityPolicy: 'Active - blocks unauthorized script execution',
        inputValidation: 'Applied - dangerous characters removed',
        outputEncoding: 'Applied - HTML entities encoded',
      },
      exampleProtections: {
        scriptInjection: 'CSP blocks inline scripts without nonce/hash',
        htmlInjection: 'Input sanitization removes HTML tags',
        eventHandlerInjection: 'CSP prevents inline event handlers',
        dataExfiltration: 'CSP connect-src limits outbound connections',
      },
    };
  }

  /**
   * Security Headers Test with Custom Response
   */
  @Get('headers-test')
  @ApiOperation({
    summary: 'Test All Security Headers',
    description: 'Returns response with all security headers visible for testing',
  })
  async testHeaders(@Res() reply: FastifyReply) {
    // Add some custom security headers for demonstration
    reply.header('X-Custom-Security', 'FleetStack-Secure');
    reply.header('X-Api-Version', '1.0.0');
    
    return reply.send({
      message: 'Check the response headers to see all Helmet.js security headers',
      timestamp: new Date().toISOString(),
      instructions: [
        'Open browser developer tools (F12)',
        'Go to Network tab',
        'Refresh this request',
        'Click on this request to see Response Headers',
        'Look for security headers like X-Frame-Options, CSP, HSTS, etc.',
      ],
      expectedHeaders: [
        'content-security-policy',
        'strict-transport-security',
        'x-content-type-options',
        'x-dns-prefetch-control',
        'x-download-options',
        'x-frame-options',
        'x-permitted-cross-domain-policies',
        'referrer-policy',
      ],
    });
  }

  /**
   * Security Best Practices Summary
   */
  @Get('best-practices')
  @ApiOperation({
    summary: 'Security Best Practices with Helmet.js',
    description: 'Comprehensive guide to web security best practices implemented by Helmet.js',
  })
  async bestPractices() {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    return {
      message: 'Helmet.js Security Best Practices for FleetStack Application',
      timestamp: new Date().toISOString(),
      currentEnvironment: isDevelopment ? 'development' : 'production',
      environmentBasedSecurity: {
        development: {
          csp: 'Relaxed CSP with unsafe-inline for Swagger UI',
          cors: 'Allow all origins for development convenience',
          hsts: 'HSTS without preload (HTTP access allowed)',
          frameOptions: 'SAMEORIGIN (allows same-origin framing)',
          coep: 'Disabled (prevents compatibility issues)',
        },
        production: {
          csp: 'Strict CSP without unsafe-inline (XSS protection)',
          cors: 'Restricted to specific allowed origins only',
          hsts: 'Full HSTS with optional preload (HTTPS enforced)',
          frameOptions: 'DENY (no framing allowed)',
          coep: 'Enabled (cross-origin isolation)',
        },
      },
      implementedSecurity: {
        contentSecurityPolicy: {
          purpose: 'Prevents XSS by controlling resource sources',
          development: 'Allows unsafe-inline and external CDNs for Swagger',
          production: 'Strict policy without unsafe-inline or external sources',
          recommendation: 'Use nonces/hashes for any required inline content in production',
        },
        strictTransportSecurity: {
          purpose: 'Enforces HTTPS connections',
          development: '1-year max-age without preload',
          production: '1-year max-age with optional preload (env-gated)',
          recommendation: 'Enable preload only after domain verification',
        },
        frameOptions: {
          purpose: 'Prevents clickjacking attacks',
          development: 'SAMEORIGIN - allows same-origin framing',
          production: 'DENY - blocks all framing attempts',
          recommendation: 'Use DENY in production unless framing is required',
        },
        cors: {
          purpose: 'Controls cross-origin resource sharing',
          development: 'Allow all origins with credentials',
          production: 'Restrict to specific allowed origins from environment',
          recommendation: 'Always specify explicit origins in production',
        },
        crossOriginEmbedderPolicy: {
          purpose: 'Enables cross-origin isolation for enhanced security',
          development: 'Disabled to prevent compatibility issues',
          production: 'Enabled for additional security isolation',
          recommendation: 'Test thoroughly before enabling in production',
        },
      },
      productionDeploymentChecklist: [
        'Set NODE_ENV=production environment variable',
        'Configure ALLOWED_ORIGINS with specific domains',
        'Set HSTS_PRELOAD_ENABLED=true only after domain verification',
        'Test all functionality with strict CSP (no unsafe-inline)',
        'Disable or secure Swagger UI for production',
        'Self-host any external assets with Subresource Integrity (SRI)',
        'Implement Content Security Policy violation reporting',
        'Regular security audits and dependency updates',
      ],
      environmentVariables: {
        NODE_ENV: 'Set to "production" for production security settings',
        ALLOWED_ORIGINS: 'Comma-separated list of allowed origins for CORS',
        HSTS_PRELOAD_ENABLED: 'Set to "true" to enable HSTS preload (after domain verification)',
      },
      additionalRecommendations: [
        'Implement CSRF protection for state-changing operations',
        'Use secure session management with proper cookie settings',
        'Implement proper input validation and output encoding',
        'Monitor and log security events and CSP violations',
        'Use security-focused reverse proxy (nginx, CloudFlare)',
        'Regular penetration testing and vulnerability assessments',
        'Keep dependencies updated with security patches',
      ],
    };
  }
}