import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrimaryDatabaseService } from '../../database/services/primary-database.service';
import { ConfigService } from '../../config/config.service';
import { RedisService } from '../../redis/redis.service';
import { LoginType } from '@prisma/primary';
import * as crypto from 'crypto';

export interface JwtPayload {
  sub: number; // user id
  username: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number;
  user: {
    uid: number;
    username: string;
    email: string;
    role: string;
    name: string;
    credits?: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private primaryDatabase: PrimaryDatabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    try {
      const user = await this.primaryDatabase.users.findFirst({
        where: {
          OR: [
            { username: username },
            { email: username }, // Allow login with email or username
          ],
          is_active: true,
          deleted_at: null,
        },
      });

      if (!user) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return null;
      }

      // Update last login
      await this.primaryDatabase.users.update({
        where: { uid: user.uid },
        data: { last_login: new Date() },
      });

      const { password_hash: _, ...result } = user;
      return result;
    } catch (error) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return await this.generateTokenResponse(user);
  }

  async signup(userData: {
    username: string;
    email: string;
    password: string;
    name: string;
    login_type?: LoginType;
  }): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await this.primaryDatabase.users.findFirst({
        where: {
          OR: [
            { username: userData.username },
            { email: userData.email },
          ],
        },
      });

      if (existingUser) {
        throw new UnauthorizedException('User already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Create user
      const newUser = await this.primaryDatabase.users.create({
        data: {
          username: userData.username,
          email: userData.email,
          password_hash: hashedPassword,
          name: userData.name,
          login_type: userData.login_type ?? LoginType.USER,
          is_active: true,
          is_email_verified: false,
          credits: 0n,
          mfa_enabled: false,
        },
      });

      const { password_hash: _, ...userResult } = newUser;
      return await this.generateTokenResponse(userResult);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Signup failed');
    }
  }

  private async generateTokenResponse(user: any): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user.uid,
      username: user.username,
      email: user.email,
      role: user.login_type,
    };

    const expiresIn = this.configService.jwtExpirationTime;
    const refreshExpiresIn = this.configService.jwtRefreshExpirationTime;
    
    const access_token = this.jwtService.sign(payload, {
      expiresIn: `${expiresIn}s`,
    });

    // Generate cryptographically secure refresh token
    const refresh_token = this.generateSecureRefreshToken();
    
    // Store refresh token in Redis with expiration and user association
    await this.storeRefreshToken(user.uid, refresh_token, refreshExpiresIn);

    return {
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_expires_in: refreshExpiresIn,
      user: {
        uid: user.uid,
        username: user.username,
        email: user.email,
        role: user.login_type,
        name: user.name,
        credits: typeof user.credits === 'bigint' ? user.credits.toString() : user.credits,
      },
    };
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Enhanced refresh token with rotation and reuse detection
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    // SECURITY: Verify refresh token exists and is valid with atomic reuse detection
    const tokenData = await this.validateRefreshToken(refreshToken);
    if (!tokenData) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // SECURITY: Atomic refresh token rotation with race condition protection
    await this.atomicRefreshTokenRotation(refreshToken, tokenData.userId);

    // Get fresh user data
    const user = await this.getUserById(tokenData.userId);
    
    // Generate new tokens (includes new refresh token with rotation)
    return await this.generateTokenResponse(user);
  }

  async getUserById(userId: number): Promise<any> {
    const user = await this.primaryDatabase.users.findUnique({
      where: {
        uid: userId,
        is_active: true,
        deleted_at: null,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { password_hash: _, credits, ...result } = user;
    return {
      ...result,
      credits: credits.toString(), // Convert BigInt to string
    };
  }

  /**
   * REFRESH TOKEN SECURITY METHODS
   */

  private generateSecureRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  private async storeRefreshToken(userId: number, refreshToken: string, expiresIn: number): Promise<void> {
    // SECURITY: Hash refresh token before storage to prevent plaintext exposure
    const tokenHash = this.hashRefreshToken(refreshToken);
    const tokenKey = `rt:${tokenHash}`;
    const userTokensKey = `ut:${userId}`;
    const issuedAt = Date.now();
    
    // Store hashed token metadata with expiration
    await this.redisService.set(tokenKey, JSON.stringify({
      userId,
      iat: issuedAt,
      active: true 
    }), expiresIn);
    
    // SECURITY: Atomic per-user token management with session cap
    await this.atomicUpdateUserTokens(userId, tokenHash, issuedAt, expiresIn);
  }

  private hashRefreshToken(token: string): string {
    // SECURITY: HMAC-SHA256 hash for secure token storage
    return crypto.createHmac('sha256', this.configService.refreshTokenSalt).update(token).digest('hex');
  }

  private async atomicUpdateUserTokens(userId: number, tokenHash: string, issuedAt: number, expiresIn: number): Promise<void> {
    const userTokensKey = `ut:${userId}`;
    const maxSessions = this.configService.refreshTokenMaxSessions;
    
    // Add new token to user's sorted set (score = issuedAt for chronological order)
    await this.redisService.zadd(userTokensKey, issuedAt, tokenHash);
    
    // SECURITY: Enforce per-user session cap to prevent session sprawl
    const tokenCount = await this.redisService.zcard(userTokensKey);
    if (tokenCount > maxSessions) {
      // Remove oldest tokens (lowest scores)
      const excess = tokenCount - maxSessions;
      const oldestTokens = await this.redisService.zrange(userTokensKey, 0, excess - 1);
      
      // Clean up old token records
      for (const oldTokenHash of oldestTokens) {
        await this.redisService.del(`rt:${oldTokenHash}`);
        await this.redisService.zrem(userTokensKey, oldTokenHash);
      }
    }
    
    // Set expiration on user tokens set
    await this.redisService.expire(userTokensKey, expiresIn);
  }

  private async validateRefreshToken(refreshToken: string): Promise<{ userId: number } | null> {
    // SECURITY: Use hashed token for lookup
    const tokenHash = this.hashRefreshToken(refreshToken);
    const tokenKey = `rt:${tokenHash}`;
    const usedMarkerKey = `rut:${tokenHash}`;
    
    const tokenData = await this.redisService.get(tokenKey);
    
    if (!tokenData) {
      // Check if token was already used (reuse detection)
      const usedMarkerValue = await this.redisService.get(usedMarkerKey);
      if (usedMarkerValue) {
        // SECURITY BREACH: Refresh token reuse detected - revoke all user sessions
        const userId = parseInt(usedMarkerValue, 10);
        if (!isNaN(userId)) {
          await this.revokeAllUserTokens(userId);
        }
        throw new UnauthorizedException('Token reuse detected - all user sessions revoked for security');
      }
      return null;
    }

    try {
      const parsed = JSON.parse(tokenData);
      return { userId: parsed.userId };
    } catch (error) {
      return null;
    }
  }

  /**
   * SECURITY: Atomic refresh token rotation with reuse detection
   */
  private async atomicRefreshTokenRotation(refreshToken: string, userId: number): Promise<boolean> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const tokenKey = `rt:${tokenHash}`;
    const usedMarkerKey = `rut:${tokenHash}`;
    
    // Get remaining TTL from the token to match used-marker TTL
    const remainingTtl = await this.redisService.ttl(tokenKey);
    const markerTtl = remainingTtl > 0 ? remainingTtl : this.configService.jwtRefreshExpirationTime;
    
    // SECURITY: Atomic "mark as used" operation with userId for reuse remediation
    const marked = await this.redisService.setNx(usedMarkerKey, userId.toString(), markerTtl);
    
    if (!marked) {
      // SECURITY: Another request already marked this token as used - REUSE DETECTED
      await this.revokeAllUserTokens(userId);
      throw new UnauthorizedException('Token reuse detected - all sessions revoked');
    }
    
    // Successfully marked as used, now invalidate the original token
    await this.redisService.del(tokenKey);
    
    // Remove from user's active tokens set
    const userTokensKey = `ut:${userId}`;
    await this.redisService.zrem(userTokensKey, tokenHash);
    
    return true;
  }

  private async revokeAllUserTokens(userId: number): Promise<void> {
    // SECURITY: Revoke all user tokens using new hashed token scheme
    const userTokensKey = `ut:${userId}`;
    const tokenHashes = await this.redisService.zrange(userTokensKey, 0, -1);
    
    // Invalidate all active refresh tokens for this user
    for (const tokenHash of tokenHashes) {
      await this.redisService.del(`rt:${tokenHash}`);
      // Also set used markers to prevent any concurrent use
      await this.redisService.setNx(`rut:${tokenHash}`, '1', 86400);
    }
    
    // Clear the user's token set
    await this.redisService.del(userTokensKey);
  }

  /**
   * Logout with proper token cleanup
   */
  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      try {
        // SECURITY: Use new hashed token scheme for logout
        const tokenHash = this.hashRefreshToken(refreshToken);
        const tokenKey = `rt:${tokenHash}`;
        const userTokensKey = `ut:*`; // We need to find which user this belongs to
        
        // Get token data to find user ID
        const tokenData = await this.redisService.get(tokenKey);
        if (tokenData) {
          const parsed = JSON.parse(tokenData);
          const userId = parsed.userId;
          
          // Remove token from user's set and invalidate
          await this.redisService.del(tokenKey);
          await this.redisService.zrem(`ut:${userId}`, tokenHash);
          
          // Mark as used to prevent any race conditions
          await this.redisService.setNx(`rut:${tokenHash}`, '1', 86400);
        }
      } catch (error) {
        // Silent fail on logout - don't expose token validation errors
      }
    }
  }
}