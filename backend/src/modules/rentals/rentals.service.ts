import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Prisma, TariffCode, OrderItemStatus } from '@prisma/client';
import { PaymentsService } from '../payments/payments.service';
import { TariffsService } from '../tariffs/tariffs.service';
import { ExtendRentalDto } from './dto/extend-rental.dto';
import dayjs from 'dayjs';
import { LockersService } from '../lockers/lockers.service';

@Injectable()
export class RentalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly tariffsService: TariffsService,
    private readonly lockersService: LockersService,
  ) {}

  async getUserRentals(userId: string) {
    await this.refreshExpiredRentals();

    const rentals = await this.prisma.orderItem.findMany({
      where: { order: { userId } },
      include: {
        locker: true,
        tariff: true,
        order: {
          include: {
            payments: {
              where: { status: 'SUCCEEDED' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      rentals.map(async (item) => {
        const meta = await this.calculateOverdueMeta(item.id);
        
        // Рассчитываем оплаченную сумму и время: суммируем все успешные платежи, связанные с этим orderItem
        let paidRub = 0;
        let paidMinutes = 0; // Общее оплаченное время в минутах
        
        for (const payment of item.order.payments) {
          const metadata = payment.payload as any;
          
          // Первоначальный платеж (без extendOrderItemId и settleOrderItemId) - учитываем для всех items пропорционально
          if (!metadata?.extendOrderItemId && !metadata?.settleOrderItemId) {
            // Это первоначальный платеж за аренду - берем базовую цену тарифа
            const baseTariff = item.tariff;
            if (baseTariff) {
              paidRub += baseTariff.priceRub;
              paidMinutes += baseTariff.durationMinutes;
            }
          }
          
          // Платеж за продление этого конкретного orderItem
          if (metadata?.extendOrderItemId === item.id) {
            paidRub += payment.amountRub;
            
            // Рассчитываем оплаченное время продления
            const tariffId = metadata.tariffId as string | undefined;
            const quantity = parseInt(metadata.quantity as string) || 1;
            
            // Получаем тариф из базы, чтобы узнать durationMinutes
            let extensionTariff = item.tariff;
            if (tariffId && tariffId !== item.tariffId) {
              extensionTariff = await this.tariffsService.getTariffById(tariffId);
            }
            
            if (extensionTariff) {
              paidMinutes += extensionTariff.durationMinutes * quantity;
            }
          }
          
          // Платеж за погашение задолженности этого orderItem
          if (metadata?.settleOrderItemId === item.id) {
            paidRub += payment.amountRub;
            // За погашение задолженности время не добавляется, это оплата уже использованного времени
          }
        }
        
        const accruedRub = paidRub + meta.overdueRub;
        const outstandingRub = Math.max(0, meta.overdueRub);
        
        return {
          ...item,
          overdueMinutes: meta.overdueMinutes,
          overdueRub: meta.overdueRub,
          paidRub,
          paidMinutes, // Общее оплаченное время
          accruedRub,
          outstandingRub,
        };
      }),
    );
  }

  async extendRental(orderItemId: string, userId: string, dto: ExtendRentalDto) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: true,
        tariff: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Аренда не найдена');
    }
    if (item.order.userId !== userId) {
      throw new ForbiddenException();
    }

    const tariff = dto.tariffId
      ? await this.tariffsService.getTariffById(dto.tariffId)
      : item.tariff ?? (await this.tariffsService.getDefaultTariff());

    const quantity = dto.quantity ?? 1;
    const totalPrice = tariff.priceRub * quantity;

    const metadata = {
      orderId: item.orderId,
      extendOrderItemId: item.id,
      tariffId: tariff.id,
      quantity: quantity.toString(),
    };

    const { confirmationUrl, payment } = await this.paymentsService.createPayment(
      item.orderId,
      totalPrice,
      userId,
      metadata,
    );

    return { confirmationUrl, paymentId: payment.id };
  }

  async settleOverdue(orderItemId: string, userId: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Аренда не найдена');
    }
    if (item.order.userId !== userId) {
      throw new ForbiddenException();
    }

    const { overdueRub, extendMinutes } = await this.calculateOverdueMeta(orderItemId);
    if (overdueRub <= 0 || extendMinutes <= 0) {
      throw new BadRequestException('Задолженность отсутствует');
    }

    const metadata = {
      orderId: item.orderId,
      settleOrderItemId: item.id,
      extendMinutes,
      type: 'OVERDUE_SETTLEMENT',
    };

    return this.paymentsService.createPayment(item.orderId, overdueRub, userId, metadata);
  }

  async completeRental(orderItemId: string, userId: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true },
    });

    if (!item) {
      throw new NotFoundException('Аренда не найдена');
    }
    if (item.order.userId !== userId) {
      throw new ForbiddenException();
    }
    if (item.status !== OrderItemStatus.ACTIVE && item.status !== OrderItemStatus.EXPIRED) {
      throw new BadRequestException('Ячейка не активна');
    }

    await this.lockersService.markFree(orderItemId);

    return { success: true };
  }

  private async refreshExpiredRentals() {
    const now = new Date();
    const expired = await this.prisma.orderItem.findMany({
      where: {
        status: 'ACTIVE',
        endAt: { lt: now },
      },
      include: {
        locker: true,
        order: true,
      },
    });

    if (!expired.length) return;

    // ВАЖНО: НЕ завершаем аренду автоматически!
    // Только переводим в статус OVERDUE для начисления задолженности
    // Ячейка остается занятой, пользователь продолжает пользоваться
    // Задолженность будет начисляться пока пользователь или менеджер не завершит аренду вручную
    
    await this.prisma.orderItem.updateMany({
      where: { id: { in: expired.map((item) => item.id) } },
      data: { status: 'OVERDUE' },
    });
    
    // Ячейки остаются OCCUPIED - пользователь может продолжать пользоваться
    // Просто ему начисляется задолженность за сверхурочное время
  }

  private async calculateOverdueMeta(orderItemId: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        tariff: true,
      },
    });

    if (!item || !item.endAt) {
      return { overdueMinutes: 0, overdueRub: 0, extendMinutes: 0 };
    }

    const now = dayjs();
    const endAt = dayjs(item.endAt);

    if (now.isBefore(endAt)) {
      return { overdueMinutes: 0, overdueRub: 0, extendMinutes: 0 };
    }

    const diffMinutes = Math.ceil(now.diff(endAt, 'minute', true));
    if (diffMinutes <= 0) {
      return { overdueMinutes: 0, overdueRub: 0, extendMinutes: 0 };
    }

    const tariff = item.tariff ?? (await this.getHourlyTariff());
    const ratePerMinute = tariff.priceRub / tariff.durationMinutes;
    const multiplier = Math.max(1, Math.ceil(diffMinutes / tariff.durationMinutes));
    const extendMinutes = multiplier * tariff.durationMinutes;
    const overdueRub = Math.ceil(extendMinutes * ratePerMinute);

    return { overdueMinutes: diffMinutes, overdueRub, extendMinutes };
  }

  private async getHourlyTariff() {
    const hourly = await this.prisma.tariff.findFirst({ where: { code: TariffCode.HOURLY } });
    if (!hourly) {
      throw new BadRequestException('Почасовой тариф не настроен');
    }
    return hourly;
  }
}
