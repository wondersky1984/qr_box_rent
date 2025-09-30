import { Injectable, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import dayjs from 'dayjs';
import { randomInt, randomUUID } from 'crypto';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { parseDurationMs } from '../../common/utils/duration';

@Injectable()
export class AuthService {
  private readonly otpTtlMinutes = 5;
  private readonly otpRateLimitMinutes = 10;
  private readonly otpRateLimitCount = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async login(phoneRaw: string, password: string) {
    const phone = this.normalizePhone(phoneRaw);
    const staticPassword = this.configService.get<string>('app.auth.staticPassword') ?? '1234';
    if (password !== staticPassword) {
      throw new UnauthorizedException('Неверный пароль');
    }

    const user = await this.prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone },
    });

    return this.createSession(user);
  }

  async startOtp(phoneRaw: string) {
    const phone = this.normalizePhone(phoneRaw);
    const since = dayjs().subtract(this.otpRateLimitMinutes, 'minute').toDate();
    const attempts = await this.prisma.otpRequest.count({
      where: {
        phone,
        createdAt: { gte: since },
      },
    });
    if (attempts >= this.otpRateLimitCount) {
      throw new ForbiddenException('Слишком много запросов, попробуйте позже');
    }

    const code = process.env.MOCK_OTP_CODE ?? randomInt(1000, 9999).toString();

    await this.prisma.otpRequest.create({
      data: {
        phone,
        code,
        expiresAt: dayjs().add(this.otpTtlMinutes, 'minute').toDate(),
      },
    });

    if (this.configService.get<boolean>('app.yookassa.mockPayments')) {
      // eslint-disable-next-line no-console
      console.log(`Mock OTP for ${phone}: ${code}`);
    }

    return true;
  }

  async verifyOtp(phoneRaw: string, code: string) {
    const phone = this.normalizePhone(phoneRaw);
    const request = await this.prisma.otpRequest.findFirst({
      where: { phone, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!request) {
      throw new BadRequestException('Код не найден');
    }

    if (dayjs(request.expiresAt).isBefore(dayjs())) {
      throw new BadRequestException('Срок действия кода истёк');
    }

    if (request.code !== code) {
      await this.prisma.otpRequest.update({
        where: { id: request.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Неверный код');
    }

    await this.prisma.otpRequest.update({
      where: { id: request.id },
      data: { consumedAt: new Date() },
    });

    const user = await this.prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone },
    });

    return this.createSession(user);
  }

  attachAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const accessTtl = parseDurationMs(this.configService.get('app.jwt.accessTtl'), 15 * 60 * 1000);
    const refreshTtl = parseDurationMs(this.configService.get('app.jwt.refreshTtl'), 30 * 24 * 60 * 60 * 1000);
    const secureCookies = this.configService.get<boolean>('app.cookies.secure');
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: secureCookies,
      path: '/',
    };
    res.cookie('lockbox_access', accessToken, { ...cookieOptions, maxAge: accessTtl });
    res.cookie('lockbox_refresh', refreshToken, { ...cookieOptions, maxAge: refreshTtl });
  }

  async refreshTokens(refreshToken?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException();
    }

    const saved = await this.prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!saved || dayjs(saved.expiresAt).isBefore(dayjs())) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({ where: { id: saved.userId } });
    if (!user) {
      throw new UnauthorizedException();
    }

    const tokens = await this.issueTokens(user.id, user.role, user.phone);

    // Сначала удаляем старый refresh token
    await this.prisma.refreshToken.delete({
      where: { id: saved.id },
    });

    // Затем создаем новый refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: dayjs().add(parseDurationMs(this.configService.get('app.jwt.refreshTtl'), 30 * 24 * 60 * 60 * 1000), 'millisecond').toDate(),
      },
    });

    return { user: { id: user.id, phone: user.phone, role: user.role }, ...tokens };
  }

  async logout(userId: string, refreshToken?: string) {
    if (!refreshToken) return;
    await this.prisma.refreshToken.deleteMany({ where: { userId, token: refreshToken } });
  }

  private normalizePhone(phone: string) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+7${digits}`;
    }
    if (digits.startsWith('7') && digits.length === 11) {
      return `+${digits}`;
    }
    if (digits.startsWith('8') && digits.length === 11) {
      return `+7${digits.slice(1)}`;
    }
    if (digits.startsWith('9') && digits.length === 10) {
      return `+7${digits}`;
    }
    return `+${digits}`;
  }

  async issueTokens(userId: string, role: Role, phone: string) {
    const payload = { sub: userId, role, phone };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = randomUUID();
    const refreshTtl = parseDurationMs(this.configService.get('app.jwt.refreshTtl'), 30 * 24 * 60 * 60 * 1000);
    const refreshExpires = dayjs().add(refreshTtl, 'millisecond').toDate();

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt: refreshExpires,
      },
    });

    return { accessToken, refreshToken };
  }

  private async createSession(user: { id: string; phone: string; role: Role }) {
    const tokens = await this.issueTokens(user.id, user.role, user.phone);

    await this.prisma.auditLog.create({
      data: {
        actorType: user.role as any,
        actorId: user.id,
        action: 'AUTH_LOGIN',
        phone: user.phone,
      },
    });

    return { user: { id: user.id, phone: user.phone, role: user.role }, ...tokens };
  }

  async findOrCreateUser(phone: string) {
    // Нормализуем номер телефона
    const normalizedPhone = this.normalizePhone(phone);
    
    // Ищем существующего пользователя
    let user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    // Если пользователь не найден, создаем нового
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: normalizedPhone,
          role: 'USER',
        },
      });
    }

    return user;
  }
}
