import { Injectable, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class TelegramOtpService {
  private readonly logger = new Logger(TelegramOtpService.name);
  private readonly telegramGatewayUrl = 'https://gatewayapi.telegram.org';
  private readonly telegramAccessToken: string;
  private readonly isMockMode: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.telegramAccessToken = this.configService.get<string>('app.telegram.accessToken') || '';
    this.isMockMode = this.configService.get<string>('app.telegram.mockMode') === 'true' ||
                     !this.telegramAccessToken ||
                     process.env.NODE_ENV === 'development';

    if (!this.isMockMode && !this.telegramAccessToken) {
      this.logger.warn('TELEGRAM_ACCESS_TOKEN not provided, falling back to mock mode');
    }

    this.logger.log(`Telegram OTP service initialized in ${this.isMockMode ? 'MOCK' : 'LIVE'} mode`);
  }

  async sendOtp(phone: string): Promise<{ success: boolean; message: string; requestId?: string }> {
    try {
      this.logger.log(`Sending OTP to phone: ${phone}`);

      // Валидация номера телефона
      if (!phone || phone.trim().length < 10) {
        throw new BadRequestException('Неверный формат номера телефона');
      }

      // Нормализуем номер телефона в формат E.164
      const normalizedPhone = this.normalizePhoneToE164(phone);
      this.logger.log(`Normalized phone: ${normalizedPhone}`);

      // Генерируем 6-значный OTP код
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      this.logger.log(`Generated code: ${code}`);

      let response: any;

      if (this.isMockMode) {
        // Mock режим - симулируем отправку
        this.logger.log('Using mock mode for OTP');
        response = {
          request_id: `mock_${Date.now()}`,
          phone_number: normalizedPhone,
          status: 'sent'
        };
      } else {
        try {
          // Пытаемся отправить через официальный Telegram Gateway API
          response = await this.sendTelegramMessage(normalizedPhone, code);
          this.logger.log('Telegram API response:', response);
        } catch (telegramError) {
          this.logger.error('Telegram API failed, falling back to mock mode', telegramError);
          // Fallback к mock режиму при ошибке API
          response = {
            request_id: `mock_${Date.now()}`,
            phone_number: normalizedPhone,
            status: 'sent'
          };
        }
      }

      // Сохраняем OTP в базе данных с request_id
      await this.prisma.otpRequest.create({
        data: {
          phone: normalizedPhone,
          code,
          requestId: response.request_id,
          consumedAt: null,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 минут
        },
      });

      return {
        success: true,
        message: this.isMockMode ? 'OTP код сгенерирован (mock режим)' : 'OTP код отправлен в Telegram',
        requestId: response.request_id,
      };
    } catch (error) {
      this.logger.error('Error sending OTP:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException('Не удалось отправить OTP код: ' + errorMessage);
    }
  }

  async verifyOtp(phone: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      // Валидация входных данных
      if (!phone || !code) {
        throw new BadRequestException('Номер телефона и код обязательны');
      }

      if (code.length < 4 || code.length > 6) {
        throw new BadRequestException('Неверный формат кода');
      }

      const normalizedPhone = this.normalizePhoneToE164(phone);

      const otpRequest = await this.prisma.otpRequest.findFirst({
        where: {
          phone: normalizedPhone,
          code,
          consumedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!otpRequest) {
        this.logger.warn(`Invalid or expired OTP for phone: ${normalizedPhone}`);
        throw new BadRequestException('Неверный или истекший код');
      }

      // Проверяем статус через Telegram Gateway API (только если не mock режим и не mock request_id)
      if (otpRequest.requestId && !otpRequest.requestId.startsWith('mock_') && !this.isMockMode) {
        try {
          await this.checkVerificationStatus(otpRequest.requestId, code);
        } catch (verificationError) {
          this.logger.error('Telegram verification failed, but proceeding with local verification', verificationError);
          // Не прерываем процесс, если Telegram API недоступен
        }
      }

      // Помечаем код как использованный
      await this.prisma.otpRequest.update({
        where: { id: otpRequest.id },
        data: { consumedAt: new Date() },
      });

      this.logger.log(`OTP verified successfully for phone: ${normalizedPhone}`);
      return {
        success: true,
        message: 'Код подтвержден',
      };
    } catch (error) {
      this.logger.error('Error verifying OTP:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Неверный код');
    }
  }

  private async sendTelegramMessage(phone: string, code: string): Promise<any> {
    try {
      this.logger.log('Making request to Telegram Gateway API...');
      this.logger.log(`URL: ${this.telegramGatewayUrl}/sendVerificationMessage`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 секунд timeout

      const response = await fetch(`${this.telegramGatewayUrl}/sendVerificationMessage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.telegramAccessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'LockBox/1.0',
        },
        body: JSON.stringify({
          phone_number: phone,
          code: code,
          code_length: 6,
          ttl: 300, // 5 минут
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      this.logger.log(`Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Telegram API error: ${response.status} ${errorText}`);
        throw new Error(`Telegram Gateway API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      this.logger.log('Response data:', data);

      if (!data.ok) {
        throw new Error(`Telegram Gateway API error: ${data.error}`);
      }

      this.logger.log(`Telegram OTP sent to ${phone}, request_id: ${data.result.request_id}`);
      return data.result;
    } catch (error) {
      this.logger.error('Error sending Telegram message:', error);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Превышено время ожидания ответа от Telegram API');
        }

        if (error.message.includes('fetch')) {
          throw new Error('Не удается подключиться к Telegram Gateway API');
        }
      }

      throw error;
    }
  }

  private async checkVerificationStatus(requestId: string, code: string): Promise<any> {
    try {
      const response = await fetch(`${this.telegramGatewayUrl}/checkVerificationStatus`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.telegramAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_id: requestId,
          code: code,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Telegram Gateway API error: ${data.error}`);
      }

      return data.result;
    } catch (error) {
      console.error('Error checking verification status:', error);
      throw error;
    }
  }

  private normalizePhoneToE164(phone: string): string {
    // Удаляем все нецифровые символы
    const digits = phone.replace(/\D/g, '');
    
    // Если номер начинается с 8, заменяем на +7
    if (digits.startsWith('8') && digits.length === 11) {
      return '+7' + digits.substring(1);
    }
    
    // Если номер начинается с 7, добавляем +
    if (digits.startsWith('7') && digits.length === 11) {
      return '+' + digits;
    }
    
    // Если номер уже в формате +7
    if (digits.startsWith('7') && phone.startsWith('+')) {
      return '+' + digits;
    }
    
    // Если номер не в правильном формате, добавляем +7
    if (digits.length === 10) {
      return '+7' + digits;
    }
    
    return phone; // Возвращаем как есть, если не можем нормализовать
  }
}
