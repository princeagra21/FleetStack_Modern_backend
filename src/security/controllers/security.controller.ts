import { Controller, Get, Post, Body, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AbuseDetectionService } from '../abuse-detection/abuse-detection.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../modules/auth/guards/roles.guard';
import { Roles } from '../../modules/auth/decorators/roles.decorator';

@ApiTags('Security Management')
@Controller('security')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SecurityController {
  constructor(private readonly abuseDetectionService: AbuseDetectionService) {}

  @Get('suspicious-activity')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get recent suspicious activity logs' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of suspicious activities',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              timestamp: { type: 'string' },
              ip: { type: 'string' },
              endpoint: { type: 'string' },
              riskScore: { type: 'number' },
              reasons: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    }
  })
  async getSuspiciousActivity(@Query() query?: { limit?: number }) {
    const activities = await this.abuseDetectionService.getSuspiciousActivity(query?.limit || 100);
    return {
      success: true,
      data: activities,
      count: activities.length
    };
  }

  @Get('blacklisted-ips')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get list of blacklisted IP addresses' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of blacklisted IPs'
  })
  async getBlacklistedIPs() {
    const blacklistedIPs = await this.abuseDetectionService.getBlacklistedIPs();
    return {
      success: true,
      data: blacklistedIPs,
      count: blacklistedIPs.length
    };
  }

  @Post('blacklist-ip')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Manually blacklist an IP address' })
  @ApiResponse({ 
    status: 200, 
    description: 'IP address blacklisted successfully'
  })
  async blacklistIP(@Body() body: { ip: string; reason: string }) {
    await this.abuseDetectionService.blacklistIP(body.ip, body.reason);
    return {
      success: true,
      message: `IP ${body.ip} has been blacklisted`,
      reason: body.reason
    };
  }

  @Delete('blacklist-ip/:ip')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Remove IP address from blacklist' })
  @ApiResponse({ 
    status: 200, 
    description: 'IP address removed from blacklist'
  })
  async removeFromBlacklist(@Param('ip') ip: string) {
    await this.abuseDetectionService.whitelistIP(ip);
    return {
      success: true,
      message: `IP ${ip} has been removed from blacklist`
    };
  }
}