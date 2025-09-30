import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PaymentsService } from '../payments/payments.service';
import { LockersService } from '../lockers/lockers.service';
import { TariffsService } from '../tariffs/tariffs.service';
import { AuditService } from '../audit/audit.service';
import dayjs from 'dayjs';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly lockersService: LockersService,
    private readonly tariffsService: TariffsService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async prepareForPayment(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            locker: true,
            tariff: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Нет доступа к заказу');
    }

    if (order.status !== 'DRAFT' && order.status !== 'AWAITING_PAYMENT') {
      throw new BadRequestException('Заказ уже обработан');
    }

    if (!order.items.length) {
      throw new BadRequestException('Корзина пуста');
    }

    // Обновляем статус элементов заказа и бронируем ячейки
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const item of order.items) {
        // Проверяем доступность ячейки
        await this.lockersService.ensureAvailable(item.lockerId);
        
        // Обновляем статус элемента заказа только если он еще не подготовлен
        if (item.status !== 'AWAITING_PAYMENT') {
          await tx.orderItem.update({
            where: { id: item.id },
            data: { 
              status: 'AWAITING_PAYMENT',
              startAt: new Date(),
              endAt: new Date(Date.now() + item.tariff.durationMinutes * 60 * 1000),
              holdUntil: new Date(Date.now() + 10 * 60 * 1000), // 10 минут брони
            },
          });
        }

        // Бронируем ячейку
        await tx.locker.update({
          where: { id: item.lockerId },
          data: { status: 'HELD' },
        });
      }
    });

    return { success: true };
  }

  async createPayment(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            locker: true,
            tariff: true,
          },
        },
        user: true,
        payments: true,
      },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    if (!order.items.length) {
      throw new BadRequestException('Корзина пуста');
    }

    // Проверяем, что заказ подготовлен к оплате
    if (order.status !== 'AWAITING_PAYMENT') {
      throw new BadRequestException('Заказ не подготовлен к оплате');
    }

    for (const item of order.items) {
      if (item.holdUntil && dayjs(item.holdUntil).isBefore(dayjs())) {
        await this.lockersService.releaseHold(item.id);
        throw new BadRequestException('Время брони истекло, выберите ячейки заново');
      }
    }

    const metadata: Record<string, unknown> = {
      orderId,
      items: order.items.map((item) => ({ lockerId: item.lockerId, tariffId: item.tariffId })),
    };

    const { confirmationUrl, payment } = await this.paymentsService.createPayment(
      orderId,
      order.totalRub,
      userId,
      metadata,
    );

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'AWAITING_PAYMENT' },
    });

    // Для mock платежей автоматически подтверждаем оплату
    if (this.configService.get('app.yookassa.mockPayments')) {
      await this.handlePaymentSuccess(payment.id);
    }

    return { confirmationUrl, paymentId: payment.id };
  }

  async confirmMockPayment(orderId: string, userId: string) {
    if (!this.configService.get('app.yookassa.mockPayments')) {
      throw new BadRequestException('Mock payments disabled');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment) {
      throw new BadRequestException('Платёж не найден');
    }
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== userId) {
      throw new ForbiddenException();
    }
    await this.paymentsService.markPaymentSucceeded(payment.id, { mock: true });
    return { success: true };
  }

  async handlePaymentSuccess(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            items: { include: { tariff: true } },
            user: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const order = payment.order;
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const rawPayload = payment.payload as any;
    const metadata = rawPayload?.metadata ?? rawPayload ?? {};

    if (metadata?.extendOrderItemId) {
      await this.handleExtension(metadata);
      return;
    }

    const activations: { itemId: string; lockerId: string }[] = [];

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.order.update({ where: { id: order.id }, data: { status: 'PAID' } });

      for (const item of order.items) {
        const tariff = item.tariff ?? (await this.tariffsService.getTariffById(item.tariffId));
        const startAt = new Date();
        const endAt = dayjs(startAt).add(tariff.durationMinutes, 'minute').toDate();

        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            status: 'ACTIVE',
            startAt,
            endAt,
            holdUntil: null,
          },
        });
        await tx.locker.update({ where: { id: item.lockerId }, data: { status: 'OCCUPIED' } });
        activations.push({ itemId: item.id, lockerId: item.lockerId });
      }
    });

    for (const activation of activations) {
      await this.auditService.createLog({
        actorType: 'SYSTEM',
        action: 'RENTAL_CREATE',
        orderId: order.id,
        orderItemId: activation.itemId,
        lockerId: activation.lockerId,
        userId: order.userId,
      });
    }
  }

  private async handleExtension(metadata: Record<string, any>) {
    const orderItemId = metadata.extendOrderItemId as string;
    if (!orderItemId) return;

    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { tariff: true },
    });
    if (!item) {
      throw new NotFoundException('Rental not found for extension');
    }

    const tariffId = metadata.tariffId as string | undefined;
    const tariff = tariffId
      ? await this.tariffsService.getTariffById(tariffId)
      : item.tariff ?? (await this.tariffsService.getDefaultTariff());

    const baseStart = item.endAt && dayjs(item.endAt).isAfter(dayjs()) ? item.endAt : new Date();
    const newEnd = dayjs(baseStart).add(tariff.durationMinutes, 'minute').toDate();

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.orderItem.update({
        where: { id: item.id },
        data: {
          status: 'ACTIVE',
          endAt: newEnd,
        },
      });
      await tx.locker.update({ where: { id: item.lockerId }, data: { status: 'OCCUPIED' } });
    });

    await this.auditService.createLog({
      actorType: 'SYSTEM',
      action: 'RENTAL_EXTEND',
      orderItemId: item.id,
      lockerId: item.lockerId,
      metadata: { newEnd },
    });
  }

  async cancelOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            locker: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Нет доступа к заказу');
    }

    if (order.status !== 'DRAFT' && order.status !== 'AWAITING_PAYMENT') {
      throw new BadRequestException('Заказ нельзя отменить');
    }

    // Освобождаем забронированные ячейки и удаляем заказ
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Освобождаем ячейки
      for (const item of order.items) {
        await tx.locker.update({
          where: { id: item.lockerId },
          data: { status: 'FREE' },
        });
      }

      // Сначала удаляем все платежи
      await tx.payment.deleteMany({
        where: { orderId: orderId },
      });

      // Затем удаляем все OrderItem
      await tx.orderItem.deleteMany({
        where: { orderId: orderId },
      });

      // И наконец удаляем заказ
      await tx.order.delete({
        where: { id: orderId },
      });
    });

    return { success: true };
  }
}
