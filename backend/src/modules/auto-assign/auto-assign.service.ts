import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TariffsService } from '../tariffs/tariffs.service';
import { LockersService } from '../lockers/lockers.service';

@Injectable()
export class AutoAssignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tariffsService: TariffsService,
    private readonly lockersService: LockersService,
  ) {}

  async assignLockerToUser(userId: string, tariffId: string) {
    // Находим первую свободную ячейку
    const freeLocker = await this.prisma.locker.findFirst({
      where: {
        status: 'FREE',
      },
      orderBy: {
        number: 'asc',
      },
    });

    if (!freeLocker) {
      throw new Error('Нет свободных ячеек');
    }

    // Получаем тариф
    const tariff = await this.tariffsService.getTariffById(tariffId);
    if (!tariff) {
      throw new Error('Тариф не найден');
    }

    // Создаем заказ
    const order = await this.prisma.order.create({
      data: {
        userId,
        status: 'DRAFT',
        totalRub: tariff.priceRub,
      },
    });

    // Создаем элемент заказа
    const orderItem = await this.prisma.orderItem.create({
      data: {
        orderId: order.id,
        lockerId: freeLocker.id,
        tariffId,
        status: 'AWAITING_PAYMENT',
        startAt: new Date(),
        endAt: new Date(Date.now() + tariff.durationMinutes * 60 * 1000),
      },
    });

    // Бронируем ячейку
    await this.prisma.locker.update({
      where: { id: freeLocker.id },
      data: { status: 'HELD' },
    });

    return {
      order,
      orderItem,
      locker: freeLocker,
      tariff,
    };
  }

  async activateRental(orderId: string) {
    // Активируем аренду после оплаты
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
      throw new Error('Заказ не найден');
    }

    // Обновляем статус заказа
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAID' },
    });

    // Активируем аренду
    await this.prisma.orderItem.updateMany({
      where: { orderId },
      data: { status: 'ACTIVE' },
    });

    // Занимаем ячейки
    await this.prisma.locker.updateMany({
      where: {
        id: {
          in: order.items.map(item => item.lockerId),
        },
      },
      data: { status: 'OCCUPIED' },
    });

    return order;
  }

  async getAvailableLockersCount() {
    const count = await this.prisma.locker.count({
      where: {
        status: 'FREE',
      },
    });
    return count;
  }

  async getUserActiveRentals(userId: string) {
    const rentals = await this.prisma.orderItem.findMany({
      where: {
        order: {
          userId,
        },
        status: {
          in: ['ACTIVE', 'OVERDUE'],
        },
      },
      include: {
        locker: true,
        tariff: true,
        order: true,
      },
    });

    return rentals;
  }
}
