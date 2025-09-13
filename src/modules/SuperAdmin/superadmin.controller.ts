import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { SuperAdminService } from './superadmin.service';
import {
  CreateSuperAdminDto,
  SuperAdminResponseDto,
} from './dto';

@ApiTags('Super Admin Management')
@Controller('superadmin')
export class SuperAdminController {
  private readonly logger = new Logger(SuperAdminController.name);

  constructor(private readonly superAdminService: SuperAdminService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new Super Admin',
    description: 'Creates a new Super Admin account with the provided details.',
  })
  @ApiResponse({
    status: 201,
    description: 'Super Admin created successfully',
    type: SuperAdminResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Username or email already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiBody({ type: CreateSuperAdminDto })
  async createSuperAdmin(
    @Body(ValidationPipe) createSuperAdminDto: CreateSuperAdminDto,
  ): Promise<SuperAdminResponseDto> {
    this.logger.log(`📝 Creating Super Admin: ${createSuperAdminDto.username}`);
    return await this.superAdminService.createSuperAdmin(createSuperAdminDto);
  }
}
