import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, ActorType, LockerStatus, OrderItemStatus, PaymentStatus } from '@prisma/client';
import dayjs from 'dayjs';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../../common/decorators/user.decorator';

@Controller('api/admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminReportsController {
  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService) {}

  @Get('summary')
  async summary(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentUser() user?: { userId: string },
  ) {
    const now = dayjs();
    const parsedFrom = from ? dayjs(from) : null;
    const parsedTo = to ? dayjs(to) : null;

    const rangeStart = parsedFrom?.isValid() ? parsedFrom.startOf('day') : now.subtract(30, 'day').startOf('day');
    const rangeEnd = parsedTo?.isValid() ? parsedTo.endOf('day') : now.endOf('day');

    const lockerGroups = await this.prisma.locker.groupBy({
      by: ['status'],
      _count: true,
    });

    const rentalsGroups = await this.prisma.orderItem.groupBy({
      by: ['status'],
      _count: true,
    });

    const totalRevenueAllTime = await this.prisma.payment.aggregate({
      where: { status: PaymentStatus.SUCCEEDED },
      _sum: { amountRub: true },
      _count: true,
    });

    const paymentsInRange = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.SUCCEEDED,
        createdAt: {
          gte: rangeStart.toDate(),
          lte: rangeEnd.toDate(),
        },
      },
      select: {
        createdAt: true,
        amountRub: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const rentalsInRange = await this.prisma.orderItem.findMany({
      where: {
        createdAt: {
          gte: rangeStart.toDate(),
          lte: rangeEnd.toDate(),
        },
      },
      select: {
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const paymentsByDayMap = new Map<string, { revenue: number; payments: number }>();
    for (const payment of paymentsInRange) {
      const key = dayjs(payment.createdAt).format('YYYY-MM-DD');
      const item = paymentsByDayMap.get(key) ?? { revenue: 0, payments: 0 };
      item.revenue += payment.amountRub;
      item.payments += 1;
      paymentsByDayMap.set(key, item);
    }

    const rentalsByDayMap = new Map<string, number>();
    for (const rental of rentalsInRange) {
      const key = dayjs(rental.createdAt).format('YYYY-MM-DD');
      rentalsByDayMap.set(key, (rentalsByDayMap.get(key) ?? 0) + 1);
    }

    const paymentsSeries = Array.from(paymentsByDayMap.entries())
      .map(([date, value]) => ({ date, ...value }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    const rentalsSeries = Array.from(rentalsByDayMap.entries())
      .map(([date, count]) => ({ date, rentals: count }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    await this.auditService.createLog({
      actorType: ActorType.ADMIN,
      actorId: user?.userId,
      action: 'REPORT_VIEW',
      metadata: {
        from: rangeStart.toISOString(),
        to: rangeEnd.toISOString(),
      },
    });

    return {
      period: {
        from: rangeStart.toISOString(),
        to: rangeEnd.toISOString(),
      },
      lockers: {
        total: lockerGroups.reduce((acc, item) => acc + item._count, 0),
        byStatus: Object.values(LockerStatus).reduce<Record<string, number>>((acc, status) => {
          acc[status] = lockerGroups.find((item) => item.status === status)?._count ?? 0;
          return acc;
        }, {}),
      },
      rentals: {
        total: rentalsGroups.reduce((acc, item) => acc + item._count, 0),
        byStatus: Object.values(OrderItemStatus).reduce<Record<string, number>>((acc, status) => {
          acc[status] = rentalsGroups.find((item) => item.status === status)?._count ?? 0;
          return acc;
        }, {}),
      },
      payments: {
        totalRevenue: totalRevenueAllTime._sum.amountRub ?? 0,
        totalPayments: totalRevenueAllTime._count,
        revenueInRange: paymentsSeries.reduce((acc, item) => acc + item.revenue, 0),
        paymentsInRange: paymentsSeries.reduce((acc, item) => acc + item.payments, 0),
      },
      charts: {
        revenueByDay: paymentsSeries,
        rentalsByDay: rentalsSeries,
      },
    };
  }
}
