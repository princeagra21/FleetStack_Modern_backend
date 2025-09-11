import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseGuards,
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
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { ApiSuccessResponse, ApiErrorResponse } from '../../common/decorators/api-response.decorator';
import { createSuccessResponse, normalizePaginationQuery } from '../../common/utils';
import type { PaginationQuery } from '../../common/interfaces';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @ApiOperation({ 
    summary: 'Create new user', 
    description: 'Create a new user account. Requires admin or superadmin privileges.' 
  })
  @ApiBody({ 
    type: CreateUserDto,
    description: 'User creation data',
    examples: {
      admin: {
        summary: 'Create admin user',
        value: { 
          username: 'newadmin', 
          email: 'newadmin@example.com', 
          name: 'New Admin User',
          login_type: 'admin'
        }
      },
      user: {
        summary: 'Create regular user',
        value: { 
          username: 'newuser', 
          email: 'newuser@example.com', 
          name: 'New Regular User',
          login_type: 'user'
        }
      }
    }
  })
  @ApiCreatedResponse({ 
    description: 'User created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'User created successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '3' },
            username: { type: 'string', example: 'newuser' },
            email: { type: 'string', example: 'newuser@example.com' },
            name: { type: 'string', example: 'New User' },
            role: { type: 'string', example: 'user' }
          }
        },
        timestamp: { type: 'string', example: '2025-09-10T17:48:06.928Z' }
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Invalid user data or user already exists' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin or superadmin role required' })
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return createSuccessResponse('User created successfully', user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @ApiOperation({ 
    summary: 'List all users', 
    description: 'Retrieve a paginated list of all users. Requires admin or superadmin privileges.' 
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)', example: 10 })
  @ApiOkResponse({ 
    description: 'Users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Users retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: '1' },
                  email: { type: 'string', example: 'user1@example.com' },
                  username: { type: 'string', example: 'user1' }
                }
              }
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 10 },
                total: { type: 'number', example: 2 },
                totalPages: { type: 'number', example: 1 },
                hasNext: { type: 'boolean', example: false },
                hasPrevious: { type: 'boolean', example: false }
              }
            }
          }
        },
        timestamp: { type: 'string', example: '2025-09-10T17:48:06.928Z' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin or superadmin role required' })
  async findAll(@Query() query: PaginationQuery) {
    const normalizedQuery = normalizePaginationQuery(query);
    const result = await this.usersService.findAll(normalizedQuery);
    return createSuccessResponse('Users retrieved successfully', result);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'superadmin')
  @ApiOperation({ 
    summary: 'Get user by ID', 
    description: 'Retrieve a specific user by their ID. Accessible to all authenticated users.' 
  })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID', example: '1' })
  @ApiOkResponse({ 
    description: 'User retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'User retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '1' },
            email: { type: 'string', example: 'user@example.com' },
            username: { type: 'string', example: 'testuser' },
            name: { type: 'string', example: 'Test User' },
            role: { type: 'string', example: 'user' }
          }
        },
        timestamp: { type: 'string', example: '2025-09-10T17:48:06.928Z' }
      }
    }
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'User role or higher required' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return createSuccessResponse('User retrieved successfully', user);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @ApiOperation({ 
    summary: 'Update user', 
    description: 'Update a user\'s information. Requires admin or superadmin privileges.' 
  })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID to update', example: '1' })
  @ApiBody({ 
    type: UpdateUserDto,
    description: 'User update data',
    examples: {
      profile: {
        summary: 'Update user profile',
        value: { 
          name: 'Updated Name',
          email: 'updated@example.com'
        }
      },
      role: {
        summary: 'Update user role',
        value: { 
          login_type: 'admin'
        }
      }
    }
  })
  @ApiOkResponse({ 
    description: 'User updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'User updated successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '1' },
            email: { type: 'string', example: 'updated@example.com' },
            username: { type: 'string', example: 'testuser' },
            name: { type: 'string', example: 'Updated Name' },
            role: { type: 'string', example: 'admin' }
          }
        },
        timestamp: { type: 'string', example: '2025-09-10T17:48:06.928Z' }
      }
    }
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Invalid update data' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin or superadmin role required' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    return createSuccessResponse('User updated successfully', user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  @ApiOperation({ 
    summary: 'Delete user', 
    description: 'Permanently delete a user account. Requires superadmin privileges only.' 
  })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID to delete', example: '1' })
  @ApiOkResponse({ 
    description: 'User deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'User deleted successfully' },
        timestamp: { type: 'string', example: '2025-09-10T17:48:06.928Z' }
      }
    }
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Superadmin role required' })
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return createSuccessResponse('User deleted successfully');
  }
}