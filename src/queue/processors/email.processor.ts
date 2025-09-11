import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailJobData } from '../queue.service';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<EmailJobData>): Promise<void> {
    this.logger.log(`Processing email job ${job.id} for ${job.data.to}`);

    try {
      await this.sendEmail(job.data);
      this.logger.log(`Email sent successfully to ${job.data.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${job.data.to}:`, error);
      throw error; // Re-throw to trigger retry
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<EmailJobData>) {
    this.logger.log(`Email job ${job.id} completed for ${job.data.to}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<EmailJobData>, error: Error) {
    this.logger.error(`Email job ${job.id} failed for ${job.data.to}: ${error.message}`);
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job<EmailJobData>, progress: number) {
    this.logger.debug(`Email job ${job.id} progress: ${progress}%`);
  }

  private async sendEmail(data: EmailJobData): Promise<void> {
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
    // For now, we'll just log the email details
    this.logger.log(`Sending email:
      To: ${data.to}
      Subject: ${data.subject}
      Template: ${data.template}
      Data: ${JSON.stringify(data.data || {})}`);

    // Simulate random failures for testing retry mechanism
    if (Math.random() < 0.1) { // 10% failure rate
      throw new Error('Simulated email service error');
    }

    // In a real implementation, you would:
    // 1. Load the email template
    // 2. Replace template variables with data
    // 3. Send via your email provider
    // 4. Handle provider-specific errors
    
    this.logger.log(`✅ Email sent successfully to ${data.to}`);
  }
}