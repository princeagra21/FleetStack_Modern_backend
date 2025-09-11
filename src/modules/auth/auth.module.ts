import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigService } from '../../config/config.service';
import { ConfigModule } from '../../config/config.module';
import { DatabaseModule } from '../../database/database.module';
import { RedisModule } from '../../redis/redis.module';
import * as fs from 'fs';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RedisModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const algorithm = configService.jwtAlgorithm;
        
        if (algorithm === 'RS256') {
          // Use RS256 with public/private key pairs for enhanced security
          // SECURITY: Keys must come from environment variables or secure key management
          const privateKey = configService.jwtPrivateKey;
          const publicKey = configService.jwtPublicKey;
          
          if (!privateKey || !publicKey) {
            throw new Error('SECURITY: RS256 requires both JWT_PRIVATE_KEY and JWT_PUBLIC_KEY environment variables. No file fallbacks allowed.');
          }
          
          return {
            privateKey,
            publicKey,
            signOptions: {
              algorithm: 'RS256' as const,
              expiresIn: `${configService.jwtExpirationTime}s`,
              issuer: 'fleetstack-api',
              audience: 'fleetstack-client',
            },
            verifyOptions: {
              algorithms: ['RS256'] as const, // SECURITY: Enforce RS256 only - prevent algorithm confusion attacks
              issuer: 'fleetstack-api',
              audience: 'fleetstack-client',
              clockTolerance: 30, // 30 seconds clock skew tolerance
              maxAge: `${configService.jwtExpirationTime}s`,
            },
          };
        } else {
          // SECURITY: Disable HS256 fallback in production
          throw new Error('SECURITY: Only RS256 algorithm is allowed for enhanced security. Set JWT_ALGORITHM=RS256 and provide RSA keys.');
        }
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}