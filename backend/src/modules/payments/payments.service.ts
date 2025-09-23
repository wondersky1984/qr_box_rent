import { forwardRef, Inject, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
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
  private readonly apiUrl = 'https://api.yookassa.ru/v3/payments';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => OrdersService)) private readonly ordersService: OrdersService,
  ) {}

  async createPayment(orderId: string, amountRub: number, userId: string, metadata: Record<string, unknown>) {
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

    const shopId = this.configService.get<string>('app.yookassa.shopId');
    const secretKey = this.configService.get<string>('app.yookassa.secretKey');

    try {
      const payload = {
        amount: {
          value: Number(amountRub).toFixed(2),
          currency: 'RUB',
        },
        capture: true,
        confirmation: {
          type: 'redirect',
          return_url: this.configService.get<string>('app.yookassa.successUrl'),
        },
        description: `LockBox Order ${orderId}`,
        metadata: jsonMetadata,
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Idempotence-Key': randomUUID(),
          'Content-Type': 'application/json',
        },
        auth: {
          username: shopId ?? '',
          password: secretKey ?? '',
        },
      });

      const responsePayload = JSON.parse(JSON.stringify(response.data)) as Prisma.InputJsonValue;

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          ykPaymentId: response.data.id,
          payload: responsePayload,
        },
      });

      return { payment, confirmationUrl: response.data?.confirmation?.confirmation_url };
    } catch (error) {
      throw new InternalServerErrorException('Не удалось создать платёж');
    }
  }

  async markPaymentSucceeded(paymentId: string, payload?: unknown) {
    const serializedPayload =
      payload !== undefined ? (JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue) : undefined;
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCEEDED',
        payload: serializedPayload,
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

  async handleWebhook(dto: PaymentsWebhookDto, signature?: string) {
    const webhookSecret = this.configService.get<string | undefined>('app.yookassa.webhookSecret');
    if (webhookSecret) {
      if (signature !== webhookSecret) {
        throw new UnauthorizedException('Invalid signature');
      }
    }

    if (dto.event === 'payment.succeeded') {
      const payment = await this.prisma.payment.findFirst({ where: { ykPaymentId: dto.object.id } });
      if (!payment) return;
      await this.markPaymentSucceeded(payment.id, dto.object);
      return payment;
    }
    return null;
  }
}
