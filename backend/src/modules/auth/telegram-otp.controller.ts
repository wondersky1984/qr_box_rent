import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { TelegramOtpService } from './telegram-otp.service';
import { AuthService } from './auth.service';

export class SendTelegramOtpDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;
}

export class VerifyTelegramOtpDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;
}

@Controller('api/auth/telegram-otp')
export class TelegramOtpController {
  constructor(
    private readonly telegramOtpService: TelegramOtpService,
    private readonly authService: AuthService,
  ) {}

  @Post('send')
  async sendOtp(@Body() dto: SendTelegramOtpDto) {
    if (!dto.phone) {
      throw new BadRequestException('Номер телефона обязателен');
    }

    return await this.telegramOtpService.sendOtp(dto.phone);
  }

  @Post('verify')
  async verifyOtp(@Body() dto: VerifyTelegramOtpDto) {
    if (!dto.phone || !dto.code) {
      throw new BadRequestException('Номер телефона и код обязательны');
    }

    // Проверяем OTP код
    await this.telegramOtpService.verifyOtp(dto.phone, dto.code);

    // Создаем или находим пользователя
    const user = await this.authService.findOrCreateUser(dto.phone);

    // Генерируем токены
    const tokens = await this.authService.issueTokens(user.id, user.role, user.phone);

    return {
      user: { id: user.id, phone: user.phone, role: user.role },
      ...tokens,
    };
  }
}
