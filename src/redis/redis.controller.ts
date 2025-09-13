import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RedisService } from './redis.service';
import { PrimaryDatabaseService } from '../database/services/primary-database.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { Roles } from '../modules/auth/decorators/roles.decorator';

@ApiTags('Redis Operations')
@Controller('redis')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RedisController {
  constructor(
    private readonly redisService: RedisService,
    private readonly primaryDb: PrimaryDatabaseService,
  ) {}

  @Get('users/:uid')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get user from Redis cache by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'User data retrieved from Redis',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' },
        source: { type: 'string', example: 'redis' }
      }
    }
  })
  async getUserFromRedis(@Param('uid') uid: string) {
    const userData = await this.redisService.getUserById(parseInt(uid));
    return {
      success: true,
      data: userData,
      source: 'redis'
    };
  }

  @Get('users/username/:username')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get user from Redis cache by username' })
  @ApiResponse({ 
    status: 200, 
    description: 'User data retrieved from Redis by username'
  })
  async getUserByUsernameFromRedis(@Param('username') username: string) {
    const userData = await this.redisService.getUserByUsername(username);
    return {
      success: true,
      data: userData,
      source: 'redis'
    };
  }

  @Post('sync/users')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Manually sync users table from PostgreSQL to Redis' })
  @ApiResponse({ 
    status: 200, 
    description: 'Users table synced successfully'
  })
  async syncUsersManually() {
    await this.redisService.syncUsersTableOnStartup();
    return {
      success: true,
      message: 'Users table synced to Redis successfully'
    };
  }

  @Post('cache')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Add data to Redis cache' })
  @ApiResponse({ 
    status: 200, 
    description: 'Data added to Redis cache successfully'
  })
  async addToCache(
    @Body() body: { key: string; value: string; ttl?: number }
  ) {
    await this.redisService.set(body.key, body.value, body.ttl);
    return {
      success: true,
      message: `Data stored in Redis with key: ${body.key}`,
      ttl: body.ttl || 'no expiration'
    };
  }

  @Get('cache/:key')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get data from Redis cache by key' })
  @ApiResponse({ 
    status: 200, 
    description: 'Data retrieved from Redis cache'
  })
  async getFromCache(@Param('key') key: string) {
    const value = await this.redisService.get(key);
    return {
      success: true,
      key,
      value,
      found: value !== null
    };
  }

  @Delete('cache/:key')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Delete data from Redis cache' })
  @ApiResponse({ 
    status: 200, 
    description: 'Data deleted from Redis cache'
  })
  async deleteFromCache(@Param('key') key: string) {
    await this.redisService.del(key);
    return {
      success: true,
      message: `Key ${key} deleted from Redis`
    };
  }

  @Get('keys')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get all keys matching a pattern from Redis' })
  @ApiResponse({ 
    status: 200, 
    description: 'Keys retrieved from Redis'
  })
  async getKeys(@Query('pattern') pattern: string = '*') {
    const keys = await this.redisService.keys(pattern);
    return {
      success: true,
      pattern,
      keys,
      count: keys.length
    };
  }

  @Put('users/:uid/sync')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Sync specific user from PostgreSQL to Redis' })
  @ApiResponse({ 
    status: 200, 
    description: 'User synced to Redis successfully'
  })
  async syncSpecificUser(@Param('uid') uid: string) {
    const user = await this.primaryDb.users.findUnique({
      where: { uid: parseInt(uid) },
      select: {
        uid: true,
        username: true,
        name: true,
        email: true,
        login_type: true,
        credits: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      return {
        success: false,
        message: `User with ID ${uid} not found in PostgreSQL`
      };
    }

    await this.redisService.setUser(user.uid, user);
    
    return {
      success: true,
      message: `User ${user.username} synced to Redis successfully`,
      userData: user
    };
  }

  @Get('health')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Check Redis connection health' })
  @ApiResponse({ 
    status: 200, 
    description: 'Redis health status'
  })
  async checkRedisHealth() {
    try {
      // Use RedisService methods instead of accessing client directly
      const testKey = 'health-check-' + Date.now();
      await this.redisService.set(testKey, 'ok', 5);
      const testValue = await this.redisService.get(testKey);
      await this.redisService.del(testKey);
      
      const isHealthy = testValue === 'ok';
      
      return {
        success: isHealthy,
        status: isHealthy ? 'connected' : 'test-failed',
        message: isHealthy ? 'Redis health check passed' : 'Redis health check failed'
      };
    } catch (error) {
      return {
        success: false,
        status: 'disconnected',
        error: error.message
      };
    }
  }

  @Post('benchmark')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Run Redis performance benchmark' })
  @ApiResponse({ 
    status: 200, 
    description: 'Benchmark results'
  })
  async runBenchmark() {
    const startTime = Date.now();
    
    try {
      // Perform 100 set operations (reduced for safety)
      const setStartTime = Date.now();
      const setPromises: Promise<void>[] = [];
      for (let i = 0; i < 100; i++) {
        setPromises.push(this.redisService.set(`benchmark:${i}`, `value_${i}`, 60));
      }
      await Promise.all(setPromises);
      const setTime = Date.now() - setStartTime;
      
      // Perform 100 get operations
      const getStartTime = Date.now();
      const getPromises: Promise<string | null>[] = [];
      for (let i = 0; i < 100; i++) {
        getPromises.push(this.redisService.get(`benchmark:${i}`));
      }
      await Promise.all(getPromises);
      const getTime = Date.now() - getStartTime;
      
      // Clean up benchmark data
      const cleanupPromises: Promise<void>[] = [];
      for (let i = 0; i < 100; i++) {
        cleanupPromises.push(this.redisService.del(`benchmark:${i}`));
      }
      await Promise.all(cleanupPromises);
    
      const totalTime = Date.now() - startTime;
      
      return {
        success: true,
        benchmark: {
          operations: 200, // 100 set + 100 get
          setOperationsTime: `${setTime}ms`,
          getOperationsTime: `${getTime}ms`,
          totalTime: `${totalTime}ms`,
          opsPerSecond: Math.round(200 / (totalTime / 1000))
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Benchmark failed: ${error.message}`
      };
    }
  }
}