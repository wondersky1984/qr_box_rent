import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PaymentsService } from '../payments/payments.service';
import { TariffsService } from '../tariffs/tariffs.service';
import { ExtendRentalDto } from './dto/extend-rental.dto';

@Injectable()
export class RentalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly tariffsService: TariffsService,
  ) {}

  async getUserRentals(userId: string) {
    await this.refreshExpiredRentals();

    const rentals = await this.prisma.orderItem.findMany({
      where: { order: { userId } },
      include: {
        locker: true,
        tariff: true,
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return rentals;
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

    const metadata = {
      orderId: item.orderId,
      extendOrderItemId: item.id,
      tariffId: tariff.id,
    };

    const { confirmationUrl, payment } = await this.paymentsService.createPayment(
      item.orderId,
      tariff.priceRub,
      userId,
      metadata,
    );

    return { confirmationUrl, paymentId: payment.id };
  }

  private async refreshExpiredRentals() {
    const now = new Date();
    const expired = await this.prisma.orderItem.findMany({
      where: {
        status: 'ACTIVE',
        endAt: { lt: now },
      },
    });

    if (!expired.length) return;

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.orderItem.updateMany({
        where: { id: { in: expired.map((item) => item.id) } },
        data: { status: 'EXPIRED' },
      });
      await tx.locker.updateMany({
        where: { id: { in: expired.map((item) => item.lockerId) } },
        data: { status: 'FREE' },
      });
    });
  }
}
