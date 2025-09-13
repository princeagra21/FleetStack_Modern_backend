import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsNotEmpty, IsBoolean, IsNumberString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoginType } from '@prisma/primary';
import { Transform, Type } from 'class-transformer';

export class CreateSuperAdminDto {
  @ApiProperty({
    description: 'Username for the super admin',
    example: 'superadmin'
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'Email address of the super admin',
    example: 'superadmin@example.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password for the super admin account',
    example: 'SecurePassword123!'
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Full name of the super admin',
    example: 'Super Administrator'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Role ID (optional)',
    example: '1'
  })
  @IsOptional()
  @IsString()
  role_id?: string;

  @ApiPropertyOptional({
    description: 'Parent user ID (optional)',
    example: '1'
  })
  @IsOptional()
  @IsString()
  parent_user_id?: string;

  @ApiPropertyOptional({
    description: 'Address ID (optional)',
    example: '1'
  })
  @IsOptional()
  @IsString()
  address_id?: string;

  @ApiPropertyOptional({
    description: 'Mobile number prefix',
    example: '+1'
  })
  @IsOptional()
  @IsString()
  mobile_prefix?: string;

  @ApiPropertyOptional({
    description: 'Mobile number',
    example: '1234567890'
  })
  @IsOptional()
  @IsString()
  mobile_number?: string;

  @ApiPropertyOptional({
    description: 'Profile image URL',
    example: 'https://example.com/profile.jpg'
  })
  @IsOptional()
  @IsString()
  profile_url?: string;

  @ApiPropertyOptional({
    description: 'Whether the account is active',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Whether email is verified',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  is_email_verified?: boolean;

  @ApiPropertyOptional({
    description: 'Whether MFA is enabled',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  mfa_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Initial credits for the super admin',
    default: '0',
    example: '1000'
  })
  @IsOptional()
  @IsString()
  credits?: string;
}

export class UpdateSuperAdminDto {
  @ApiPropertyOptional({
    description: 'Username for the super admin',
    example: 'superadmin_updated'
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  username?: string;

  @ApiPropertyOptional({
    description: 'Email address of the super admin',
    example: 'updated@example.com'
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'New password for the super admin account',
    example: 'NewSecurePassword123!'
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({
    description: 'Full name of the super admin',
    example: 'Updated Administrator'
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    description: 'Role ID',
    example: '1'
  })
  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => value ? BigInt(value) : null)
  role_id?: bigint;

  @ApiPropertyOptional({
    description: 'Parent user ID',
    example: '1'
  })
  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => value ? BigInt(value) : null)
  parent_user_id?: bigint;

  @ApiPropertyOptional({
    description: 'Address ID',
    example: '1'
  })
  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => value ? BigInt(value) : null)
  address_id?: bigint;

  @ApiPropertyOptional({
    description: 'Mobile number prefix',
    example: '+1'
  })
  @IsOptional()
  @IsString()
  mobile_prefix?: string;

  @ApiPropertyOptional({
    description: 'Mobile number',
    example: '1234567890'
  })
  @IsOptional()
  @IsString()
  mobile_number?: string;

  @ApiPropertyOptional({
    description: 'Profile image URL',
    example: 'https://example.com/profile.jpg'
  })
  @IsOptional()
  @IsString()
  profile_url?: string;

  @ApiPropertyOptional({
    description: 'Whether the account is active',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Whether email is verified'
  })
  @IsOptional()
  @IsBoolean()
  is_email_verified?: boolean;

  @ApiPropertyOptional({
    description: 'Whether MFA is enabled'
  })
  @IsOptional()
  @IsBoolean()
  mfa_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Credits for the super admin',
    example: '1000'
  })
  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => value ? BigInt(value) : undefined)
  credits?: bigint;
}

export class SuperAdminFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by username (partial match)',
    example: 'admin'
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    description: 'Filter by email (partial match)',
    example: '@example.com'
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Filter by name (partial match)',
    example: 'Super'
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by mobile number (partial match)',
    example: '123456'
  })
  @IsOptional()
  @IsString()
  mobile_number?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status'
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by email verification status'
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  is_email_verified?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by MFA status'
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  mfa_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by role ID',
    example: '1'
  })
  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => value ? BigInt(value) : undefined)
  role_id?: bigint;

  @ApiPropertyOptional({
    description: 'Filter by parent user ID',
    example: '1'
  })
  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => value ? BigInt(value) : undefined)
  parent_user_id?: bigint;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'created_at'
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc'
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class SuperAdminResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '1'
  })
  uid: string;

  @ApiProperty({
    description: 'Username',
    example: 'superadmin'
  })
  username: string;

  @ApiProperty({
    description: 'Email address',
    example: 'superadmin@example.com'
  })
  email: string;

  @ApiProperty({
    description: 'Full name',
    example: 'Super Administrator'
  })
  name: string;

  @ApiProperty({
    description: 'Login type',
    enum: LoginType
  })
  login_type: LoginType;

  @ApiPropertyOptional({
    description: 'Role ID',
    example: '1'
  })
  role_id?: string;

  @ApiPropertyOptional({
    description: 'Parent user ID',
    example: '1'
  })
  parent_user_id?: string;

  @ApiPropertyOptional({
    description: 'Address ID',
    example: '1'
  })
  address_id?: string;

  @ApiPropertyOptional({
    description: 'Mobile prefix',
    example: '+1'
  })
  mobile_prefix?: string;

  @ApiPropertyOptional({
    description: 'Mobile number',
    example: '1234567890'
  })
  mobile_number?: string;

  @ApiPropertyOptional({
    description: 'Profile URL',
    example: 'https://example.com/profile.jpg'
  })
  profile_url?: string;

  @ApiProperty({
    description: 'Account status',
    example: true
  })
  is_active: boolean;

  @ApiProperty({
    description: 'Email verification status',
    example: true
  })
  is_email_verified: boolean;

  @ApiProperty({
    description: 'MFA enabled status',
    example: false
  })
  mfa_enabled: boolean;

  @ApiProperty({
    description: 'Account credits',
    example: '1000'
  })
  credits: string;

  @ApiProperty({
    description: 'Account creation date',
    example: '2024-01-01T00:00:00.000Z'
  })
  created_at: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2024-01-01T00:00:00.000Z'
  })
  updated_at: Date;

  @ApiPropertyOptional({
    description: 'Last login date',
    example: '2024-01-01T00:00:00.000Z'
  })
  last_login?: Date;

  @ApiPropertyOptional({
    description: 'Deleted date (null if active)',
    example: null
  })
  deleted_at?: Date;
}

export class SuperAdminStatsDto {
  @ApiProperty({
    description: 'Total number of super admins',
    example: 5
  })
  total: number;

  @ApiProperty({
    description: 'Number of active super admins',
    example: 4
  })
  active: number;

  @ApiProperty({
    description: 'Number of inactive super admins',
    example: 1
  })
  inactive: number;

  @ApiProperty({
    description: 'Number of super admins with verified email',
    example: 3
  })
  emailVerified: number;

  @ApiProperty({
    description: 'Number of super admins with MFA enabled',
    example: 2
  })
  mfaEnabled: number;
}

export class BulkActionDto {
  @ApiProperty({
    description: 'Array of user IDs to perform bulk action on',
    example: ['1', '2', '3']
  })
  @IsNotEmpty()
  @Transform(({ value }) => Array.isArray(value) ? value.map(id => BigInt(id)) : [])
  userIds: bigint[];

  @ApiProperty({
    description: 'Action to perform',
    enum: ['activate', 'deactivate', 'delete', 'verify_email']
  })
  @IsEnum(['activate', 'deactivate', 'delete', 'verify_email'])
  action: 'activate' | 'deactivate' | 'delete' | 'verify_email';
}
