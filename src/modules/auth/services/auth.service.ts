import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';

@Injectable()
export class AuthService {
    private prisma = new PrismaClient();

    constructor(private jwtService: JwtService) { }

    async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
        const { name, email, username, password, mobile_prefix, mobile_number } = registerDto;

        const existingUser = await this.prisma.users.findFirst({
            where: {
                OR: [
                    { email },
                    { username }
                ]
            }
        });

        if (existingUser) {
            throw new ConflictException('User with this email or username already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await this.prisma.users.create({
            data: {
                name,
                email,
                username,
                password_hash: hashedPassword,
                login_type: 'SUPERADMIN',
                mobile_prefix,
                mobile_number,
                is_active: true,
                is_email_verified: false,
            }
        });

        const payload = {
            sub: user.uid.toString(),
            username: user.username,
            email: user.email,
            role: user.login_type,
        };

        const token = this.jwtService.sign(payload);
        const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });

        return {
            token,
            refresh_token,
            user: {
                id: user.uid.toString(),
                role: user.login_type,
                username: user.username,
                email: user.email,
                name: user.name,
            }
        };
    }

    async login(loginDto: LoginDto): Promise<AuthResponseDto> {
        const { identifier, password } = loginDto;

        const user = await this.prisma.users.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier }
                ],
                is_active: true
            }
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        await this.prisma.users.update({
            where: { uid: user.uid },
            data: { last_login: new Date() }
        });

        const payload = {
            sub: user.uid.toString(),
            username: user.username,
            email: user.email,
            role: user.login_type,
        };

        const token = this.jwtService.sign(payload);
        const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });

        return {
            token,
            refresh_token,
            user: {
                id: user.uid.toString(),
                role: user.login_type,
                username: user.username,
                email: user.email,
                name: user.name,
            }
        };
    }

    async validateUser(userId: string) {
        return await this.prisma.users.findFirst({
            where: {
                uid: BigInt(userId),
                is_active: true
            },
            select: {
                uid: true,
                username: true,
                email: true,
                name: true,
                login_type: true,
            }
        });
    }
}
