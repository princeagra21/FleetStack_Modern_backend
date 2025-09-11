import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '../../../config/config.service';
import { AuthService, JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    try {
      // Verify user still exists and is active
      const user = await this.authService.getUserById(payload.sub);
      
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Add payload info to user object for guards
      return {
        ...user,
        role: payload.role,
        tokenPayload: payload,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}