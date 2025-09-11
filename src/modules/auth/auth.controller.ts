import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, SignupDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'User login', 
    description: 'Authenticate a user with username and password. Returns a JWT token for subsequent requests.' 
  })
  @ApiBody({ 
    type: LoginDto,
    description: 'User login credentials',
    examples: {
      admin: {
        summary: 'Admin login',
        value: { username: 'ajay', password: 'Stack@321' }
      },
      user: {
        summary: 'Regular user login',
        value: { username: 'testuser', password: 'Test@123' }
      }
    }
  })
  @ApiOkResponse({ 
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string', description: 'JWT access token' },
        token_type: { type: 'string', example: 'Bearer' },
        expires_in: { type: 'number', example: 3600, description: 'Token expiry in seconds' },
        user: {
          type: 'object',
          properties: {
            uid: { type: 'number', example: 1 },
            username: { type: 'string', example: 'ajay' },
            email: { type: 'string', example: 'ajay@example.com' },
            role: { type: 'string', example: 'admin' },
            name: { type: 'string', example: 'Ajay' }
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Invalid credentials or missing fields' })
  @ApiUnauthorizedResponse({ description: 'Authentication failed' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.username, loginDto.password);
  }

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'User registration', 
    description: 'Create a new user account. Returns a JWT token upon successful registration.' 
  })
  @ApiBody({ 
    type: SignupDto,
    description: 'User registration details',
    examples: {
      user: {
        summary: 'Regular user signup',
        value: { 
          username: 'newuser', 
          email: 'newuser@example.com', 
          password: 'SecurePass@123',
          name: 'New User',
          login_type: 'user'
        }
      },
      admin: {
        summary: 'Admin user signup',
        value: { 
          username: 'newadmin', 
          email: 'admin@example.com', 
          password: 'AdminPass@123',
          name: 'Admin User',
          login_type: 'admin'
        }
      }
    }
  })
  @ApiCreatedResponse({ 
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string', description: 'JWT access token' },
        token_type: { type: 'string', example: 'Bearer' },
        expires_in: { type: 'number', example: 3600 },
        user: {
          type: 'object',
          properties: {
            uid: { type: 'number', example: 3 },
            username: { type: 'string', example: 'newuser' },
            email: { type: 'string', example: 'newuser@example.com' },
            role: { type: 'string', example: 'user' },
            name: { type: 'string', example: 'New User' }
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Invalid data or user already exists' })
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup({
      username: signupDto.username,
      email: signupDto.email,
      password: signupDto.password,
      name: signupDto.name,
      login_type: signupDto.login_type,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get user profile', 
    description: 'Retrieve the authenticated user\'s profile information including role and user details.' 
  })
  @ApiOkResponse({ 
    description: 'Profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Profile retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            uid: { type: 'number', example: 1 },
            login_type: { type: 'string', example: 'admin' },
            Name: { type: 'string', example: 'Ajay' },
            Email: { type: 'string', example: 'ajay@example.com' },
            username: { type: 'string', example: 'ajay' },
            role: { type: 'string', example: 'admin' },
            credits: { type: 'string', example: '0' },
            tokenPayload: {
              type: 'object',
              properties: {
                sub: { type: 'number', example: 1 },
                username: { type: 'string', example: 'ajay' },
                email: { type: 'string', example: 'ajay@example.com' },
                role: { type: 'string', example: 'admin' },
                iat: { type: 'number', example: 1757526380 },
                exp: { type: 'number', example: 1757529980 }
              }
            }
          }
        },
        timestamp: { type: 'string', example: '2025-09-10T17:48:06.928Z' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  async getProfile(@Request() req) {
    return {
      success: true,
      message: 'Profile retrieved successfully',
      data: req.user,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Refresh JWT tokens with rotation', 
    description: 'Generate new access and refresh tokens using a valid refresh token. Features refresh token rotation and reuse detection for enhanced security.' 
  })
  @ApiBody({ 
    type: RefreshTokenDto,
    description: 'Refresh token for generating new tokens',
    examples: {
      refresh: {
        summary: 'Refresh token request',
        value: { refresh_token: 'abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234yzab5678cdef9012' }
      }
    }
  })
  @ApiOkResponse({ 
    description: 'Tokens refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string', description: 'New JWT access token' },
        refresh_token: { type: 'string', description: 'New refresh token (rotated)' },
        token_type: { type: 'string', example: 'Bearer' },
        expires_in: { type: 'number', example: 3600 },
        refresh_expires_in: { type: 'number', example: 604800 },
        user: {
          type: 'object',
          properties: {
            uid: { type: 'number', example: 1 },
            username: { type: 'string', example: 'ajay' },
            email: { type: 'string', example: 'ajay@example.com' },
            role: { type: 'string', example: 'admin' },
            name: { type: 'string', example: 'Ajay' }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token. Token reuse detected.' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refresh_token);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'User logout with refresh token cleanup', 
    description: 'Logout user and invalidate their refresh token for secure session termination.' 
  })
  @ApiBody({ 
    type: RefreshTokenDto,
    description: 'Refresh token to invalidate on logout',
    required: false,
    examples: {
      logout: {
        summary: 'Logout with token cleanup',
        value: { refresh_token: 'abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234yzab5678cdef9012' }
      }
    }
  })
  @ApiOkResponse({ 
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Logged out successfully' },
        timestamp: { type: 'string', example: '2025-09-10T17:48:06.928Z' }
      }
    }
  })
  async logout(@Body() refreshTokenDto?: RefreshTokenDto) {
    // Clean up refresh token on logout
    if (refreshTokenDto?.refresh_token) {
      await this.authService.logout(refreshTokenDto.refresh_token);
    }
    
    return {
      success: true,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString(),
    };
  }
}