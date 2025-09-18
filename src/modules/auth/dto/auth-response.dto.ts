import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'JWT access token' })
    token: string;

    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'JWT refresh token' })
    refresh_token: string;

    @ApiProperty({
        example: {
            id: '1',
            role: 'SUPERADMIN',
            username: 'admin123',
            email: 'admin@fleetstack.com',
            name: 'John Doe'
        },
        description: 'User information'
    })
    user: {
        id: string;
        role: string;
        username: string;
        email: string;
        name: string;
    };
}
