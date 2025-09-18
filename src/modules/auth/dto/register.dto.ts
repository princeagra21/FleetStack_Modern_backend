import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
    @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({ example: 'admin@fleetstack.com', description: 'Email address' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'admin123', description: 'Username for login' })
    @IsNotEmpty()
    @IsString()
    username: string;

    @ApiProperty({ example: 'SecurePass123!', description: 'Password (minimum 8 characters)' })
    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    password: string;

    @ApiProperty({ example: '+1', description: 'Mobile prefix', required: false })
    @IsOptional()
    @IsString()
    mobile_prefix?: string;

    @ApiProperty({ example: '1234567890', description: 'Mobile number', required: false })
    @IsOptional()
    @IsString()
    mobile_number?: string;
}
