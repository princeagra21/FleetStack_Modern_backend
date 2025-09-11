import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LoginType } from '@prisma/primary';

export class LoginDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class SignupDto {
  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(LoginType)
  login_type?: LoginType;
}

export class RefreshTokenDto {
  @ApiProperty({ 
    description: 'Refresh token for generating new access tokens',
    example: 'abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234yzab5678cdef9012'
  })
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}