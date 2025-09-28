import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { LockerStatus, ActorType, Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import { LOCKER_DRIVER, LockerDriver } from '../locker-driver/locker-driver.interface';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class LockersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOCKER_DRIVER) private readonly lockerDriver: LockerDriver,
    private readonly auditService: AuditService,
  ) {}

  async getLockers(filter?: { status?: LockerStatus[]; search?: string }) {
    await this.releaseExpiredHolds();
    await this.releaseExpiredFreezes();
    await this.refreshExpiredRentals();
    const statusFilter = filter?.status;
    const statuses = statusFilter
      ? Array.isArray(statusFilter)
        ? statusFilter
        : [statusFilter]
      : undefined;
    const searchNumber = filter?.search ? Number(filter.search) : undefined;

    return this.prisma.locker.findMany({
      where: {
        status: statuses ? { in: statuses } : undefined,
        number: searchNumber && !Number.isNaN(searchNumber) ? searchNumber : undefined,
      },
      orderBy: { number: 'asc' },
    });
  }

  async getManagerLockers(filter?: { status?: LockerStatus[]; search?: string }) {
    await this.releaseExpiredHolds();
    await this.releaseExpiredFreezes();
    await this.refreshExpiredRentals();
    const statusFilter = filter?.status;
    const statuses = statusFilter
      ? Array.isArray(statusFilter)
        ? statusFilter
        : [statusFilter]
      : undefined;
    const searchNumber = filter?.search ? Number(filter.search) : undefined;

    const lockers = await this.prisma.locker.findMany({
      where: {
        status: statuses ? { in: statuses } : undefined,
        number: searchNumber && !Number.isNaN(searchNumber) ? searchNumber : undefined,
      },
      include: {
        orderItems: {
          where: {
            status: { in: ['ACTIVE', 'OVERDUE', 'AWAITING_PAYMENT'] }
          },
          include: {
            order: {
              include: {
                user: true
              }
            },
            tariff: true
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { number: 'asc' },
    });

    return lockers.map(locker => ({
      ...locker,
      currentRental: locker.orderItems[0] || null
    }));
  }

  async getLocker(id: string) {
    const locker = await this.prisma.locker.findUnique({ where: { id } });
    if (!locker) {
      throw new NotFoundException('Locker not found');
    }
    return locker;
  }

  async ensureAvailable(lockerId: string) {
    await this.releaseExpiredFreezes();
    const locker = await this.getLocker(lockerId);
    const unavailableStatuses: LockerStatus[] = [
      LockerStatus.OCCUPIED,
      LockerStatus.FROZEN,
      LockerStatus.OUT_OF_ORDER,
    ];
    if (unavailableStatuses.includes(locker.status)) {
      throw new BadRequestException('Ячейка недоступна');
    }
    if (locker.status === LockerStatus.HELD) {
      const activeHold = await this.prisma.orderItem.findFirst({
        where: {
          lockerId,
          status: 'AWAITING_PAYMENT',
          holdUntil: { gt: new Date() },
        },
      });
      if (activeHold) {
        throw new BadRequestException('Ячейка временно занята');
      }
    }
    return locker;
  }

  async holdLocker(lockerId: string, orderItemId: string, holdMinutes: number) {
    await this.ensureAvailable(lockerId);
    const holdUntil = dayjs().add(holdMinutes, 'minute').toDate();
    await this.prisma.$transaction([
      this.prisma.locker.update({
        where: { id: lockerId },
        data: { status: LockerStatus.HELD },
      }),
      this.prisma.orderItem.update({
        where: { id: orderItemId },
        data: {
          status: 'AWAITING_PAYMENT',
          holdUntil,
        },
      }),
    ]);
  }

  async releaseHold(orderItemId: string) {
    const orderItem = await this.prisma.orderItem.findUnique({ where: { id: orderItemId } });
    if (!orderItem) return;
    await this.prisma.$transaction([
      this.prisma.orderItem.update({
        where: { id: orderItemId },
        data: { status: 'CREATED', holdUntil: null },
      }),
      this.prisma.locker.update({
        where: { id: orderItem.lockerId },
        data: { status: LockerStatus.FREE },
      }),
    ]);
  }

  async markOccupied(orderItemId: string, startAt: Date, endAt: Date) {
    const orderItem = await this.prisma.orderItem.findUnique({ where: { id: orderItemId } });
    if (!orderItem) return;
    await this.prisma.$transaction([
      this.prisma.orderItem.update({
        where: { id: orderItemId },
        data: {
          status: 'ACTIVE',
          startAt,
          endAt,
          holdUntil: null,
        },
      }),
      this.prisma.locker.update({
        where: { id: orderItem.lockerId },
        data: { status: LockerStatus.OCCUPIED },
      }),
    ]);
  }

  async markFree(orderItemId: string) {
    const orderItem = await this.prisma.orderItem.findUnique({ where: { id: orderItemId } });
    if (!orderItem) return;
    await this.prisma.$transaction([
      this.prisma.orderItem.update({
        where: { id: orderItemId },
        data: { status: 'CLOSED' },
      }),
      this.prisma.locker.update({
        where: { id: orderItem.lockerId },
        data: { status: LockerStatus.FREE },
      }),
    ]);
  }

  async releaseExpiredFreezes() {
    const now = new Date();
    const lockers = await this.prisma.locker.findMany({
      where: { status: LockerStatus.FROZEN, freezeUntil: { lt: now } },
    });
    if (!lockers.length) return;
    await this.prisma.locker.updateMany({
      where: { id: { in: lockers.map((locker) => locker.id) } },
      data: { status: LockerStatus.FREE, freezeUntil: null, freezeReason: null },
    });
  }

  async releaseExpiredHolds() {
    const expiredItems = await this.prisma.orderItem.findMany({
      where: {
        status: 'AWAITING_PAYMENT',
        holdUntil: { lt: new Date() },
      },
    });
    if (expiredItems.length === 0) return;
    const lockerIds = expiredItems.map((item) => item.lockerId);
    const orderIds = Array.from(new Set(expiredItems.map((item) => item.orderId)));

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.orderItem.updateMany({
        where: { id: { in: expiredItems.map((item) => item.id) } },
        data: { status: 'CREATED', holdUntil: null },
      });
      await tx.locker.updateMany({
        where: { id: { in: lockerIds } },
        data: { status: LockerStatus.FREE },
      });

      const orders = await tx.order.findMany({
        where: { id: { in: orderIds } },
        include: { items: true },
      });

      for (const order of orders) {
        const hasAwaiting = order.items.some((item) => item.status === 'AWAITING_PAYMENT');
        if (!hasAwaiting && order.status === 'AWAITING_PAYMENT') {
          await tx.order.update({ where: { id: order.id }, data: { status: 'DRAFT' } });
        }
      }
    });
  }

  async freezeLocker(lockerId: string, until?: Date, reason?: string, actor?: { actorId?: string; actorType: ActorType; ip?: string; userAgent?: string }) {
    await this.prisma.locker.update({
      where: { id: lockerId },
      data: {
        status: LockerStatus.FROZEN,
        freezeUntil: until,
        freezeReason: reason,
      },
    });
    const actorType = actor?.actorType ?? ActorType.SYSTEM;
    await this.auditService.createLog({
      actorType,
      actorId: actor?.actorId,
      action: 'LOCKER_FREEZE',
      lockerId,
      metadata: { until, reason },
      ip: actor?.ip,
      userAgent: actor?.userAgent,
    });
  }

  async unfreezeLocker(lockerId: string, actor?: { actorId?: string; actorType: ActorType; ip?: string; userAgent?: string }) {
    await this.prisma.locker.update({
      where: { id: lockerId },
      data: {
        status: LockerStatus.FREE,
        freezeUntil: null,
        freezeReason: null,
      },
    });
    const actorType = actor?.actorType ?? ActorType.SYSTEM;
    await this.auditService.createLog({
      actorType,
      actorId: actor?.actorId,
      action: 'LOCKER_UNFREEZE',
      lockerId,
      ip: actor?.ip,
      userAgent: actor?.userAgent,
    });
  }

  async openLocker(lockerId: string, actor: { actorId?: string; actorType: ActorType; source: 'PAID' | 'ADMIN'; ip?: string; userAgent?: string }) {
    await this.lockerDriver.open(lockerId);
    await this.auditService.createLog({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: 'LOCKER_OPEN',
      lockerId,
      metadata: { source: actor.source },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
  }

  async refreshExpiredRentals() {
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

    // Разделяем на оплаченные и неоплаченные
    const paidRentals = expired.filter(item => item.order.status === 'PAID');
    const unpaidRentals = expired.filter(item => item.order.status !== 'PAID');

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Завершаем только полностью оплаченные аренды
      if (paidRentals.length > 0) {
        await tx.orderItem.updateMany({
          where: { id: { in: paidRentals.map((item) => item.id) } },
          data: { status: 'EXPIRED' },
        });
        await tx.locker.updateMany({
          where: { id: { in: paidRentals.map((item) => item.lockerId) } },
          data: { status: 'FREE' },
        });
      }

      // Переводим неоплаченные аренды в статус OVERDUE (просроченные, но не завершенные)
      if (unpaidRentals.length > 0) {
        await tx.orderItem.updateMany({
          where: { id: { in: unpaidRentals.map((item) => item.id) } },
          data: { status: 'OVERDUE' },
        });
        // Ячейки остаются занятыми до ручного завершения
      }
    });
  }

  async releaseUnpaidLocker(lockerId: string, actor: { actorId?: string; actorType: ActorType; ip?: string; userAgent?: string }) {
    // Находим неоплаченные аренды для этой ячейки
    const unpaidRentals = await this.prisma.orderItem.findMany({
      where: {
        lockerId,
        status: { in: ['AWAITING_PAYMENT', 'ACTIVE'] },
        order: {
          status: { in: ['AWAITING_PAYMENT', 'DRAFT'] }
        }
      },
      include: {
        order: true
      }
    });

    if (unpaidRentals.length === 0) {
      throw new BadRequestException('Нет неоплаченных аренд для этой ячейки');
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Отменяем неоплаченные аренды
      await tx.orderItem.updateMany({
        where: { id: { in: unpaidRentals.map(item => item.id) } },
        data: { status: 'CLOSED' }
      });

      // Обновляем статус заказов
      const orderIds = [...new Set(unpaidRentals.map(item => item.orderId))];
      await tx.order.updateMany({
        where: { id: { in: orderIds } },
        data: { status: 'CANCELED' }
      });

      // Освобождаем ячейку
      await tx.locker.update({
        where: { id: lockerId },
        data: { status: LockerStatus.FREE }
      });
    });

    // Логируем действие
    await this.auditService.createLog({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: 'LOCKER_RELEASE_UNPAID',
      lockerId,
      metadata: { 
        releasedRentals: unpaidRentals.length,
        orderIds: [...new Set(unpaidRentals.map(item => item.orderId))]
      },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
  }
}
