import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';

export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  data?: Record<string, any>;
}

export interface NotificationJobData {
  userId: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, any>;
}

export interface UserProcessingJobData {
  userId: number;
  action: 'profile-update' | 'account-verification' | 'data-export';
  data?: Record<string, any>;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('notification') private notificationQueue: Queue,
    @InjectQueue('user-processing') private userProcessingQueue: Queue,
  ) {}

  // Email Queue Methods
  async sendEmail(data: EmailJobData, options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
  }): Promise<Job> {
    const job = await this.emailQueue.add('send-email', data, {
      delay: options?.delay || 0,
      priority: options?.priority || 0,
      attempts: options?.attempts || 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 50,
      removeOnFail: 100,
    });

    this.logger.log(`Email job queued: ${job.id} for ${data.to}`);
    return job;
  }

  async sendBulkEmails(emails: EmailJobData[], options?: {
    delay?: number;
    priority?: number;
  }): Promise<Job[]> {
    const jobs = emails.map(email => ({
      name: 'send-email',
      data: email,
      opts: {
        delay: options?.delay || 0,
        priority: options?.priority || 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }));

    const addedJobs = await this.emailQueue.addBulk(jobs);
    this.logger.log(`Bulk email jobs queued: ${addedJobs.length} emails`);
    return addedJobs;
  }

  // Notification Queue Methods
  async sendNotification(data: NotificationJobData, options?: {
    delay?: number;
    priority?: number;
  }): Promise<Job> {
    const job = await this.notificationQueue.add('send-notification', data, {
      delay: options?.delay || 0,
      priority: options?.priority || 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    this.logger.log(`Notification job queued: ${job.id} for user ${data.userId}`);
    return job;
  }

  async scheduleNotification(data: NotificationJobData, scheduleTime: Date): Promise<Job> {
    const delay = scheduleTime.getTime() - Date.now();
    
    if (delay <= 0) {
      throw new Error('Schedule time must be in the future');
    }

    return this.sendNotification(data, { delay });
  }

  // User Processing Queue Methods
  async processUser(data: UserProcessingJobData, options?: {
    priority?: number;
  }): Promise<Job> {
    const job = await this.userProcessingQueue.add('process-user', data, {
      priority: options?.priority || 0,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: 20,
      removeOnFail: 50,
    });

    this.logger.log(`User processing job queued: ${job.id} for user ${data.userId}, action: ${data.action}`);
    return job;
  }

  // Queue Management Methods
  async getQueueStats() {
    const [emailStats, notificationStats, userProcessingStats] = await Promise.all([
      this.getQueueCounts(this.emailQueue),
      this.getQueueCounts(this.notificationQueue),
      this.getQueueCounts(this.userProcessingQueue),
    ]);

    return {
      email: emailStats,
      notification: notificationStats,
      userProcessing: userProcessingStats,
    };
  }

  private async getQueueCounts(queue: Queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.pause();
    this.logger.log(`Queue ${queueName} paused`);
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.resume();
    this.logger.log(`Queue ${queueName} resumed`);
  }

  async cleanQueue(queueName: string, jobType: 'completed' | 'failed' | 'active' | 'waiting'): Promise<string[]> {
    const queue = this.getQueueByName(queueName);
    const jobIds = await queue.clean(0, 100, jobType);
    this.logger.log(`Cleaned ${jobIds.length} ${jobType} jobs from ${queueName} queue`);
    return jobIds;
  }

  private getQueueByName(name: string): Queue {
    switch (name) {
      case 'email':
        return this.emailQueue;
      case 'notification':
        return this.notificationQueue;
      case 'user-processing':
        return this.userProcessingQueue;
      default:
        throw new Error(`Unknown queue: ${name}`);
    }
  }
}