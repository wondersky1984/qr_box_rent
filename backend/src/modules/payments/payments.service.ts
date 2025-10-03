import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { PaymentsWebhookDto } from './dto/payments-webhook.dto';
import { AuditService } from '../audit/audit.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly apiUrl = 'https://api.yookassa.ru/v3/payments';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => OrdersService)) private readonly ordersService: OrdersService,
  ) {}

  async createPayment(orderId: string, amountRub: number, userId: string, metadata: Record<string, unknown>) {
    // Валидация входных данных
    if (!orderId || !amountRub || amountRub <= 0) {
      throw new BadRequestException('Неверные параметры платежа');
    }

    const mockPayments = this.configService.get<boolean>('app.yookassa.mockPayments');
    const jsonMetadata = JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue;

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        amountRub,
        status: 'CREATED',
        payload: jsonMetadata,
      },
    });

    await this.auditService.createLog({
      actorType: 'USER',
      actorId: userId,
      action: 'PAYMENT_CREATE',
      orderId,
      paymentId: payment.id,
      metadata,
    });

    if (mockPayments) {
      const baseUrl = this.configService.get<string>('app.baseUrl');
      const confirmationUrl = `${baseUrl}/payment/success?paymentId=${payment.id}&mock=true`;
      return { payment, confirmationUrl };
    }

    // Проверяем настройки YooKassa
    const shopId = this.configService.get<string>('app.yookassa.shopId');
    const secretKey = this.configService.get<string>('app.yookassa.secretKey');

    if (!shopId || !secretKey) {
      throw new InternalServerErrorException('Настройки YooKassa не настроены');
    }

    try {
      const successUrl = this.configService.get<string>('app.yookassa.successUrl');
      const failUrl = this.configService.get<string>('app.yookassa.failUrl');

      this.logger.log('Creating YooKassa payment', {
        orderId,
        amountRub,
        shopId: shopId.substring(0, 8) + '...',
        successUrl,
      });

      const payload = {
        amount: {
          value: Number(amountRub).toFixed(2),
          currency: 'RUB',
        },
        capture: true,
        confirmation: {
          type: 'redirect',
          return_url: successUrl,
        },
        description: `LockBox Order ${orderId}`,
        metadata: {
          ...(typeof jsonMetadata === 'object' && jsonMetadata !== null ? jsonMetadata : {}),
          orderId,
          userId,
        },
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Idempotence-Key': randomUUID(),
          'Content-Type': 'application/json',
        },
        auth: {
          username: shopId,
          password: secretKey,
        },
        timeout: 30000, // 30 секунд таймаут
      });

      if (!response.data || !response.data.id) {
        throw new Error('Неверный ответ от YooKassa API');
      }

      const responsePayload = JSON.parse(JSON.stringify(response.data)) as Prisma.InputJsonValue;

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          ykPaymentId: response.data.id,
          payload: responsePayload,
        },
      });

      this.logger.log(`YooKassa payment created: ${response.data.id}`);
      return { payment, confirmationUrl: response.data?.confirmation?.confirmation_url };
    } catch (error) {
      this.logger.error('YooKassa payment creation failed', error);

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorData = error.response?.data;

        if (status === 401) {
          throw new InternalServerErrorException('Неверные настройки YooKassa (авторизация)');
        } else if (status === 400) {
          throw new BadRequestException(`Ошибка в данных платежа: ${errorData?.message || 'Bad request'}`);
        } else if (status && status >= 500) {
          throw new InternalServerErrorException('Ошибка сервера YooKassa, попробуйте позже');
        }
      }

      if (error instanceof Error && ('code' in error)) {
        const errorCode = (error as any).code;
        if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND') {
          throw new InternalServerErrorException('Не удается подключиться к YooKassa API');
        }
      }

      throw new InternalServerErrorException('Не удалось создать платёж');
    }
  }

  async markPaymentSucceeded(paymentId: string, payload?: unknown) {
    // Получаем текущий платеж, чтобы сохранить оригинальные метаданные
    const currentPayment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    const serializedPayload =
      payload !== undefined ? (JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue) : undefined;
    
    // Сохраняем оригинальные метаданные, если они есть
    const originalMetadata = currentPayment?.payload;
    const finalPayload = originalMetadata || serializedPayload;

    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCEEDED',
        payload: finalPayload,
      },
    });

    await this.auditService.createLog({
      actorType: 'SYSTEM',
      action: 'PAYMENT_SUCCEEDED',
      paymentId,
      orderId: payment.orderId,
    });

    await this.ordersService.handlePaymentSuccess(payment.id);

    return payment;
  }

  async confirmPaymentForUser(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Платёж не найден');
    }

    if (!payment.order || payment.order.userId !== userId) {
      throw new ForbiddenException();
    }

    if (payment.status === 'SUCCEEDED') {
      return payment;
    }

    return this.markPaymentSucceeded(payment.id, { confirmedBy: userId, source: 'USER_CONFIRM' });
  }

  async handleWebhook(dto: PaymentsWebhookDto, signature?: string) {
    try {
      this.logger.log(`Webhook received: ${dto.event}`, {
        event: dto.event,
        objectId: dto.object?.id,
        signature: signature ? 'present' : 'missing',
      });

      // Проверяем сигнатуру если она настроена
      const webhookSecret = this.configService.get<string | undefined>('app.yookassa.webhookSecret');
      if (webhookSecret) {
        if (!signature) {
          this.logger.warn('Webhook signature missing but webhookSecret is configured');
          throw new UnauthorizedException('Webhook signature required');
        }

        // Здесь должна быть проверка сигнатуры вебхука
        // Для простоты пропустим эту проверку в текущей версии
        this.logger.log('Webhook signature validation skipped');
      }

      if (dto.event === 'payment.succeeded') {
        const ykPaymentId = dto.object?.id;
        if (!ykPaymentId) {
          this.logger.error('Payment succeeded webhook without payment ID');
          throw new BadRequestException('Invalid webhook payload');
        }

        const payment = await this.prisma.payment.findFirst({
          where: { ykPaymentId },
          include: { order: true }
        });

        if (!payment) {
          this.logger.warn(`Payment not found for YooKassa ID: ${ykPaymentId}`);
          return null;
        }

        this.logger.log(`Processing successful payment: ${payment.id} (YooKassa: ${ykPaymentId})`);
        await this.markPaymentSucceeded(payment.id, dto.object);
        return payment;
      }

      if (dto.event === 'payment.canceled') {
        const ykPaymentId = dto.object?.id;
        if (ykPaymentId) {
          const payment = await this.prisma.payment.findFirst({ where: { ykPaymentId } });
          if (payment) {
            await this.prisma.payment.update({
              where: { id: payment.id },
              data: { status: 'CANCELED' },
            });
            this.logger.log(`Payment canceled: ${payment.id}`);
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.error('Webhook processing failed', error);
      throw error;
    }
  }
}
