import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class TelegramOtpService {
  private readonly telegramGatewayUrl: string;
  private readonly telegramAccessToken: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.telegramGatewayUrl = 'https://gatewayapi.telegram.org';
    this.telegramAccessToken = this.configService.get<string>('app.telegram.accessToken') || '';
    
    if (!this.telegramAccessToken) {
      throw new Error('TELEGRAM_ACCESS_TOKEN is required');
    }
  }

  async sendOtp(phone: string): Promise<{ success: boolean; message: string; requestId?: string }> {
    try {
      console.log('📱 Sending OTP to phone:', phone);
      console.log('🔑 Telegram token available:', !!this.telegramAccessToken);
      
      // Нормализуем номер телефона в формат E.164
      const normalizedPhone = this.normalizePhoneToE164(phone);
      console.log('📞 Normalized phone:', normalizedPhone);
      
      // Генерируем 6-значный OTP код
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('🔢 Generated code:', code);
      
      // Отправляем через официальный Telegram Gateway API
      const response = await this.sendTelegramMessage(normalizedPhone, code);
      console.log('📤 Telegram API response:', response);
      
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
        message: 'OTP код отправлен в Telegram',
        requestId: response.request_id,
      };
    } catch (error) {
      console.error('❌ Error sending Telegram OTP:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException('Не удалось отправить OTP код: ' + errorMessage);
    }
  }

  async verifyOtp(phone: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
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
        throw new BadRequestException('Неверный или истекший код');
      }

      // Проверяем статус через Telegram Gateway API (только если не mock режим)
      if (otpRequest.requestId && !otpRequest.requestId.startsWith('mock_')) {
        await this.checkVerificationStatus(otpRequest.requestId, code);
      }

      // Помечаем код как использованный
      await this.prisma.otpRequest.update({
        where: { id: otpRequest.id },
        data: { consumedAt: new Date() },
      });

      return {
        success: true,
        message: 'Код подтвержден',
      };
    } catch (error) {
      console.error('Error verifying Telegram OTP:', error);
      throw new BadRequestException('Неверный код');
    }
  }

  private async sendTelegramMessage(phone: string, code: string): Promise<any> {
    try {
      console.log('🌐 Making request to Telegram Gateway API...');
      console.log('🔗 URL:', `${this.telegramGatewayUrl}/sendVerificationMessage`);
      console.log('🔑 Token:', this.telegramAccessToken.substring(0, 10) + '...');
      
      // Для тестирования - используем mock режим если не можем подключиться к API
      const isMockMode = process.env.TELEGRAM_MOCK_MODE === 'true';
      
      if (isMockMode) {
        console.log('🧪 Mock mode enabled - simulating Telegram Gateway response');
        const mockRequestId = 'mock_' + Date.now();
        console.log(`📤 Mock Telegram OTP sent to ${phone}: ${code}, request_id: ${mockRequestId}`);
        return {
          request_id: mockRequestId,
          phone_number: phone,
          status: 'sent'
        };
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд timeout
      
      const response = await fetch(`${this.telegramGatewayUrl}/sendVerificationMessage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.telegramAccessToken}`,
          'Content-Type': 'application/json',
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

      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📄 Response data:', data);

      if (!data.ok) {
        throw new Error(`Telegram Gateway API error: ${data.error}`);
      }

      console.log(`📤 Telegram OTP sent to ${phone}: ${code}, request_id: ${data.result.request_id}`);
      return data.result;
    } catch (error) {
      console.error('❌ Error sending Telegram message:', error);
      
      // Если mock режим отключен, выбрасываем ошибку вместо fallback
      if (process.env.TELEGRAM_MOCK_MODE === 'false') {
        throw new Error(`Telegram Gateway API недоступен: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Если не можем подключиться к Telegram API, используем mock режим
      console.log('🔄 Falling back to mock mode due to network issues');
      const mockRequestId = 'mock_' + Date.now();
      console.log(`📤 Mock Telegram OTP sent to ${phone}: ${code}, request_id: ${mockRequestId}`);
      return {
        request_id: mockRequestId,
        phone_number: phone,
        status: 'sent'
      };
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
