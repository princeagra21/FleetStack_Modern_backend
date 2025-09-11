import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerConfig } from '../interfaces/security.interfaces';

enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitBreakerMetrics {
  failures: number;
  successes: number;
  requests: number;
  lastFailureTime: number;
  lastSuccessTime: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly config: CircuitBreakerConfig;
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private readonly metrics: CircuitBreakerMetrics;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      enabled: this.configService.get('CIRCUIT_BREAKER_ENABLED', 'true') === 'true',
      failureThreshold: parseInt(this.configService.get('CIRCUIT_BREAKER_FAILURE_THRESHOLD', '5'), 10),
      resetTimeout: parseInt(this.configService.get('CIRCUIT_BREAKER_RESET_TIMEOUT', '60000'), 10), // 1 minute
      monitoringWindow: parseInt(this.configService.get('CIRCUIT_BREAKER_MONITORING_WINDOW', '60000'), 10), // 1 minute
    };

    this.metrics = {
      failures: 0,
      successes: 0,
      requests: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
    };

    this.logger.log(`Circuit breaker initialized: ${JSON.stringify(this.config)}`);
  }

  async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (!this.config.enabled) {
      return operation();
    }

    // Check if circuit should be closed after timeout
    this.updateState();

    switch (this.state) {
      case CircuitBreakerState.OPEN:
        this.logger.warn('Circuit breaker is OPEN, executing fallback');
        if (fallback) {
          return fallback();
        }
        throw new Error('Circuit breaker is OPEN and no fallback provided');

      case CircuitBreakerState.HALF_OPEN:
        try {
          const result = await operation();
          this.recordSuccess();
          return result;
        } catch (error) {
          this.recordFailure();
          if (fallback) {
            return fallback();
          }
          throw error;
        }

      case CircuitBreakerState.CLOSED:
      default:
        try {
          this.metrics.requests++;
          const result = await operation();
          this.recordSuccess();
          return result;
        } catch (error) {
          this.recordFailure();
          if (fallback) {
            return fallback();
          }
          throw error;
        }
    }
  }

  private updateState(): void {
    const now = Date.now();

    switch (this.state) {
      case CircuitBreakerState.OPEN:
        // Check if reset timeout has passed
        if (now - this.metrics.lastFailureTime >= this.config.resetTimeout) {
          this.state = CircuitBreakerState.HALF_OPEN;
          this.logger.log('Circuit breaker state changed to HALF_OPEN');
        }
        break;

      case CircuitBreakerState.HALF_OPEN:
        // Stay in half-open state until we get a success or failure
        break;

      case CircuitBreakerState.CLOSED:
        // Check if we should open the circuit
        if (this.shouldOpenCircuit()) {
          this.state = CircuitBreakerState.OPEN;
          this.logger.warn(`Circuit breaker opened due to ${this.metrics.failures} failures in monitoring window`);
        }
        break;
    }
  }

  private shouldOpenCircuit(): boolean {
    const now = Date.now();
    const windowStart = now - this.config.monitoringWindow;

    // Only count recent failures within the monitoring window
    if (this.metrics.lastFailureTime < windowStart) {
      this.metrics.failures = 0; // Reset old failures outside window
    }

    return this.metrics.failures >= this.config.failureThreshold;
  }

  private recordSuccess(): void {
    this.metrics.successes++;
    this.metrics.lastSuccessTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Successful request in half-open state closes the circuit
      this.state = CircuitBreakerState.CLOSED;
      this.metrics.failures = 0; // Reset failure count
      this.logger.log('Circuit breaker state changed to CLOSED after successful request');
    }
  }

  private recordFailure(): void {
    this.metrics.failures++;
    this.metrics.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Failed request in half-open state opens the circuit
      this.state = CircuitBreakerState.OPEN;
      this.logger.warn('Circuit breaker state changed to OPEN after failed request in HALF_OPEN state');
    }
  }

  getStatus() {
    return {
      state: this.state,
      config: this.config,
      metrics: {
        ...this.metrics,
        failureRate: this.metrics.requests > 0 ? this.metrics.failures / this.metrics.requests : 0,
      },
    };
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.metrics.failures = 0;
    this.metrics.successes = 0;
    this.metrics.requests = 0;
    this.metrics.lastFailureTime = 0;
    this.metrics.lastSuccessTime = 0;
    this.logger.log('Circuit breaker manually reset');
  }

  // Manually open circuit (for testing or emergency)
  forceOpen(): void {
    this.state = CircuitBreakerState.OPEN;
    this.logger.warn('Circuit breaker manually forced to OPEN state');
  }

  // Manually close circuit (for testing or recovery)
  forceClose(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.metrics.failures = 0;
    this.logger.log('Circuit breaker manually forced to CLOSED state');
  }
}