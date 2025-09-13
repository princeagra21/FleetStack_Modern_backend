import { Injectable, ConflictException, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrimaryDatabaseService } from '../../database/services/primary-database.service';
import { ConfigService } from '../../config/config.service';
import { LoginType } from '@prisma/primary';
import * as bcrypt from 'bcrypt';
import {
  CreateSuperAdminDto,
  SuperAdminResponseDto,
} from './dto';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    private readonly primaryDatabase: PrimaryDatabaseService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new Super Admin
   */
  async createSuperAdmin(createDto: CreateSuperAdminDto): Promise<SuperAdminResponseDto> {
    try {
      // Check if username or email already exists
      const existingUser = await this.primaryDatabase.users.findFirst({
        where: {
          OR: [
            { username: createDto.username },
            { email: createDto.email },
          ],
          deleted_at: null,
        },
      });

      if (existingUser) {
        throw new ConflictException('Username or email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(createDto.password, 12);

      // Create super admin
      const superAdmin = await this.primaryDatabase.performanceQuery(
        () => this.primaryDatabase.users.create({
          data: {
            username: createDto.username,
            email: createDto.email,
            password_hash: hashedPassword,
            name: createDto.name,
            login_type: LoginType.SUPERADMIN,
            role_id: createDto.role_id ? BigInt(createDto.role_id) : null,
            parent_user_id: createDto.parent_user_id ? BigInt(createDto.parent_user_id) : null,
            address_id: createDto.address_id ? BigInt(createDto.address_id) : null,
            mobile_prefix: createDto.mobile_prefix,
            mobile_number: createDto.mobile_number,
            profile_url: createDto.profile_url,
            is_active: createDto.is_active ?? true,
            is_email_verified: createDto.is_email_verified ?? false,
            mfa_enabled: createDto.mfa_enabled ?? false,
            credits: createDto.credits ? BigInt(createDto.credits) : 0n,
          },
        }),
        'CreateSuperAdmin'
      );

      this.logger.log(`✅ Super Admin created: ${superAdmin.username} (ID: ${superAdmin.uid})`);

      return this.formatUserResponse(superAdmin);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('❌ Failed to create Super Admin:', error);
      throw new InternalServerErrorException('Failed to create Super Admin');
    }
  }

  /**
   * Format user response (remove sensitive data and format credits)
   */
  private formatUserResponse(user: any): SuperAdminResponseDto {
    return {
      uid: typeof user.uid === 'bigint' ? user.uid.toString() : user.uid?.toString(),
      username: user.username,
      email: user.email,
      name: user.name,
      login_type: user.login_type,
      role_id: typeof user.role_id === 'bigint' ? user.role_id.toString() : user.role_id?.toString(),
      parent_user_id: typeof user.parent_user_id === 'bigint' ? user.parent_user_id.toString() : user.parent_user_id?.toString(),
      address_id: typeof user.address_id === 'bigint' ? user.address_id.toString() : user.address_id?.toString(),
      mobile_prefix: user.mobile_prefix,
      mobile_number: user.mobile_number,
      profile_url: user.profile_url,
      is_active: user.is_active,
      is_email_verified: user.is_email_verified,
      mfa_enabled: user.mfa_enabled,
      credits: typeof user.credits === 'bigint' ? user.credits.toString() : user.credits?.toString() || '0',
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login: user.last_login,
      deleted_at: user.deleted_at,
    };
  }
}
