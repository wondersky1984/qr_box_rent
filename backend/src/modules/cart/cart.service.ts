import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { LockersService } from '../lockers/lockers.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { ConfigService } from '@nestjs/config';
import { TariffsService } from '../tariffs/tariffs.service';
import { RemoveFromCartDto } from './dto/remove-from-cart.dto';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lockersService: LockersService,
    private readonly tariffsService: TariffsService,
    private readonly configService: ConfigService,
  ) {}

  async getCart(userId: string) {
    await this.lockersService.releaseExpiredHolds();
    const order = await this.prisma.order.findFirst({
      where: { userId, status: 'DRAFT' },
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
      return { order: null };
    }
    return { order };
  }

  async addToCart(userId: string, dto: AddToCartDto) {
    await this.lockersService.ensureAvailable(dto.lockerId);

    const existingActive = await this.prisma.orderItem.findFirst({
      where: {
        lockerId: dto.lockerId,
        order: { userId },
        status: { in: ['AWAITING_PAYMENT', 'ACTIVE'] },
      },
    });
    if (existingActive) {
      throw new BadRequestException('Ячейка уже выбрана');
    }

    const tariff = dto.tariffId
      ? await this.tariffsService.getTariffById(dto.tariffId)
      : await this.tariffsService.getDefaultTariff();

    const holdMinutes = this.configService.get<number>('app.lockers.holdMinutes') ?? 10;

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let order = await tx.order.findFirst({ where: { userId, status: 'DRAFT' } });
      if (!order) {
        order = await tx.order.create({ data: { userId, status: 'DRAFT' } });
      }

      const existingItem = await tx.orderItem.findFirst({
        where: {
          orderId: order.id,
          lockerId: dto.lockerId,
        },
      });

      if (existingItem) {
        throw new BadRequestException('Ячейка уже в корзине');
      }

      const item = await tx.orderItem.create({
        data: {
          orderId: order.id,
          lockerId: dto.lockerId,
          tariffId: tariff.id,
          status: 'CREATED',
        },
        include: {
          locker: true,
          tariff: true,
        },
      });

      await this.recalculateTotal(tx, order.id);
      return { orderId: order.id, item };
    });

    await this.lockersService.holdLocker(result.item.lockerId, result.item.id, holdMinutes);

    return this.getCart(userId);
  }

  async removeFromCart(userId: string, dto: RemoveFromCartDto) {
    const order = await this.prisma.order.findFirst({
      where: { userId, status: 'DRAFT' },
    });
    if (!order) {
      return { order: null };
    }

    const item = await this.prisma.orderItem.findFirst({
      where: { orderId: order.id, lockerId: dto.lockerId },
    });
    if (!item) {
      return this.getCart(userId);
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.orderItem.delete({ where: { id: item.id } });
      await tx.locker.update({ where: { id: dto.lockerId }, data: { status: 'FREE' } });
      await this.recalculateTotal(tx, order.id);
    });

    const remaining = await this.prisma.orderItem.count({ where: { orderId: order.id } });
    if (remaining === 0) {
      await this.prisma.order.delete({ where: { id: order.id } });
      return { order: null };
    }

    return this.getCart(userId);
  }

  private async recalculateTotal(tx: Prisma.TransactionClient, orderId: string) {
    const items = await tx.orderItem.findMany({
      where: { orderId },
      include: { tariff: true },
    });
    const total = items.reduce((acc, item) => acc + (item.tariff?.priceRub ?? 0), 0);
    await tx.order.update({ where: { id: orderId }, data: { totalRub: total } });
  }
}
