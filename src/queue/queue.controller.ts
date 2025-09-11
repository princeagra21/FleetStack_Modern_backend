import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { QueueService, EmailJobData, NotificationJobData, UserProcessingJobData } from './queue.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { Roles } from '../modules/auth/decorators/roles.decorator';

@ApiTags('Queue Management')
@Controller('queue')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post('email')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Queue an email job' })
  @ApiResponse({ status: 201, description: 'Email job queued successfully' })
  async queueEmail(@Body() data: EmailJobData & { delay?: number; priority?: number }) {
    const { delay, priority, ...emailData } = data;
    const job = await this.queueService.sendEmail(emailData, { delay, priority });
    
    return {
      success: true,
      jobId: job.id,
      message: 'Email job queued successfully',
    };
  }

  @Post('email/bulk')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Queue multiple email jobs' })
  @ApiResponse({ status: 201, description: 'Bulk email jobs queued successfully' })
  async queueBulkEmails(@Body() data: { emails: EmailJobData[]; delay?: number; priority?: number }) {
    const jobs = await this.queueService.sendBulkEmails(data.emails, {
      delay: data.delay,
      priority: data.priority,
    });
    
    return {
      success: true,
      jobIds: jobs.map(job => job.id),
      count: jobs.length,
      message: 'Bulk email jobs queued successfully',
    };
  }

  @Post('notification')
  @Roles('admin', 'superadmin', 'user')
  @ApiOperation({ summary: 'Queue a notification job' })
  @ApiResponse({ status: 201, description: 'Notification job queued successfully' })
  async queueNotification(@Body() data: NotificationJobData & { delay?: number; priority?: number }) {
    const { delay, priority, ...notificationData } = data;
    const job = await this.queueService.sendNotification(notificationData, { delay, priority });
    
    return {
      success: true,
      jobId: job.id,
      message: 'Notification job queued successfully',
    };
  }

  @Post('notification/schedule')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Schedule a notification for future delivery' })
  @ApiResponse({ status: 201, description: 'Notification scheduled successfully' })
  async scheduleNotification(@Body() data: NotificationJobData & { scheduleTime: string }) {
    const { scheduleTime, ...notificationData } = data;
    const job = await this.queueService.scheduleNotification(
      notificationData,
      new Date(scheduleTime)
    );
    
    return {
      success: true,
      jobId: job.id,
      scheduledFor: scheduleTime,
      message: 'Notification scheduled successfully',
    };
  }

  @Post('user-processing')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Queue a user processing job' })
  @ApiResponse({ status: 201, description: 'User processing job queued successfully' })
  async queueUserProcessing(@Body() data: UserProcessingJobData & { priority?: number }) {
    const { priority, ...processingData } = data;
    const job = await this.queueService.processUser(processingData, { priority });
    
    return {
      success: true,
      jobId: job.id,
      message: 'User processing job queued successfully',
    };
  }

  @Get('stats')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get queue statistics' })
  @ApiResponse({ status: 200, description: 'Queue statistics retrieved successfully' })
  async getQueueStats() {
    const stats = await this.queueService.getQueueStats();
    
    return {
      success: true,
      data: stats,
    };
  }

  @Post(':queueName/pause')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Pause a queue' })
  @ApiResponse({ status: 200, description: 'Queue paused successfully' })
  async pauseQueue(@Param('queueName') queueName: string) {
    await this.queueService.pauseQueue(queueName);
    
    return {
      success: true,
      message: `Queue ${queueName} paused successfully`,
    };
  }

  @Post(':queueName/resume')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Resume a paused queue' })
  @ApiResponse({ status: 200, description: 'Queue resumed successfully' })
  async resumeQueue(@Param('queueName') queueName: string) {
    await this.queueService.resumeQueue(queueName);
    
    return {
      success: true,
      message: `Queue ${queueName} resumed successfully`,
    };
  }

  @Post(':queueName/clean')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Clean jobs from a queue' })
  @ApiResponse({ status: 200, description: 'Queue cleaned successfully' })
  async cleanQueue(
    @Param('queueName') queueName: string,
    @Query('type') jobType: 'completed' | 'failed' | 'active' | 'waiting' = 'completed'
  ) {
    const cleanedJobIds = await this.queueService.cleanQueue(queueName, jobType);
    
    return {
      success: true,
      cleanedJobs: cleanedJobIds.length,
      message: `Cleaned ${cleanedJobIds.length} ${jobType} jobs from ${queueName} queue`,
    };
  }
}