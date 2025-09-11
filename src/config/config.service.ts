import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;
  url: string;
}

export interface LoggingConfig {
  enabled: boolean;
  level: string;
  maxResponseLogString: number;
}

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  get primaryDatabase(): DatabaseConfig {
    return {
      host: this.configService.get<string>('PRIMARY_DB_HOST', 'localhost'),
      port: this.configService.get<number>('PRIMARY_DB_PORT', 5432),
      user: this.configService.get<string>('PRIMARY_DB_USER', 'postgres'),
      password: this.configService.get<string>('PRIMARY_DB_PASSWORD', 'password'),
      name: this.configService.get<string>('PRIMARY_DB_NAME', 'FleetStack_db'),
      url: this.configService.get<string>('PRIMARY_DATABASE_URL', ''),
    };
  }

  get logsDatabase(): DatabaseConfig {
    return {
      host: this.configService.get<string>('LOGS_DB_HOST', 'localhost'),
      port: this.configService.get<number>('LOGS_DB_PORT', 5433),
      user: this.configService.get<string>('LOGS_DB_USER', 'postgres'),
      password: this.configService.get<string>('LOGS_DB_PASSWORD', 'password'),
      name: this.configService.get<string>('LOGS_DB_NAME', 'FleetStack_logs'),
      url: this.configService.get<string>('LOGS_DATABASE_URL', ''),
    };
  }

  get addressDatabase(): DatabaseConfig {
    return {
      host: this.configService.get<string>('ADDRESS_DB_HOST', 'localhost'),
      port: this.configService.get<number>('ADDRESS_DB_PORT', 5434),
      user: this.configService.get<string>('ADDRESS_DB_USER', 'postgres'),
      password: this.configService.get<string>('ADDRESS_DB_PASSWORD', 'password'),
      name: this.configService.get<string>('ADDRESS_DB_NAME', 'FleetStack_Address'),
      url: this.configService.get<string>('ADDRESS_DATABASE_URL', ''),
    };
  }

  get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET', 'default-secret');
  }

  get jwtPrivateKey(): string {
    return this.configService.get<string>('JWT_PRIVATE_KEY', '');
  }

  get jwtPublicKey(): string {
    return this.configService.get<string>('JWT_PUBLIC_KEY', '');
  }

  get jwtAlgorithm(): 'HS256' | 'RS256' {
    return this.configService.get<string>('JWT_ALGORITHM', 'HS256') as 'HS256' | 'RS256';
  }

  get jwtExpirationTime(): number {
    return this.configService.get<number>('JWT_EXPIRATION_TIME', 3600);
  }

  get jwtRefreshExpirationTime(): number {
    return this.configService.get<number>('JWT_REFRESH_EXPIRATION_TIME', 604800); // 7 days default
  }

  get refreshTokenSalt(): string {
    const salt = this.configService.get<string>('REFRESH_TOKEN_SALT', '');
    if (!salt) {
      throw new Error('SECURITY: REFRESH_TOKEN_SALT environment variable is required for token hashing');
    }
    return salt;
  }

  get refreshTokenMaxSessions(): number {
    return this.configService.get<number>('REFRESH_TOKEN_MAX_SESSIONS', 5);
  }

  get logging(): LoggingConfig {
    return {
      enabled: this.configService.get<string>('LOG_ENABLE', 'false').toLowerCase() === 'true',
      level: this.configService.get<string>('LOGGER_LEVEL', 'INFO').toUpperCase(),
      maxResponseLogString: this.configService.get<number>('MAX_RESP_LOG_STRING', 300),
    };
  }
}