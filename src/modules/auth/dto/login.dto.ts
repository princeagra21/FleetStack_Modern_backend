import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
    @ApiProperty({ example: 'admin123', description: 'Username or email' })
    @IsNotEmpty()
    @IsString()
    identifier: string;

    @ApiProperty({ example: 'SecurePass123!', description: 'Password' })
    @IsNotEmpty()
    @IsString()
    password: string;
}
