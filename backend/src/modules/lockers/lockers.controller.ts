import { Controller, Get, Param, Query, Post, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { LockersService } from './lockers.service';
import { GetLockersQueryDto } from './dto/get-lockers-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActorType } from '@prisma/client';
import { Request } from 'express';
import { SettingsService } from '../settings/settings.service';

@Controller('api/lockers')
export class LockersController {
  constructor(
    private readonly lockersService: LockersService, 
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService
  ) {}

  @Get()
  async list(@Query() query: GetLockersQueryDto) {
    // Для админов и менеджеров показываем расширенную информацию
    return this.lockersService.getManagerLockers(query);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.lockersService.getLocker(id);
  }

  @Post(':id/open')
  @UseGuards(JwtAuthGuard)
  async openUserLocker(
    @Param('id') lockerId: string,
    @CurrentUser() user: { userId: string; role: string; phone: string },
    @Req() req: Request,
  ) {
    const rental = await this.prisma.orderItem.findFirst({
      where: {
        lockerId,
        status: { in: ['ACTIVE', 'OVERDUE'] },
        order: { userId: user.userId },
      },
      include: {
        tariff: true,
        order: true
      }
    });
    
    if (!rental) {
      throw new ForbiddenException('Аренда не найдена');
    }

    const now = new Date();
    const endTime = rental.endAt ? new Date(rental.endAt) : null;
    
    // Проверяем, можно ли открыть ячейку
    if (rental.status === 'ACTIVE' && endTime && endTime > now) {
      // Аренда активна и не истекла
    } else if (rental.status === 'OVERDUE' || (endTime && endTime <= now)) {
      // Аренда истекла, проверяем льготный период
      if (endTime) {
        const gracePeriodMinutes = await this.settingsService.getGracePeriodMinutes(rental.tariff.code as 'HOURLY' | 'DAILY');
        const gracePeriodEnd = new Date(endTime.getTime() + gracePeriodMinutes * 60 * 1000);
        
        if (now > gracePeriodEnd) {
          throw new ForbiddenException('Льготный период для открытия истек');
        }
      }
    } else {
      throw new ForbiddenException('Аренда не активна');
    }

    await this.lockersService.openLocker(lockerId, {
      actorId: user.userId,
      actorType: ActorType.USER,
      source: 'PAID',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { success: true };
  }

  @Post(':id/open-and-complete')
  @UseGuards(JwtAuthGuard)
  async openAndCompleteUserLocker(
    @Param('id') lockerId: string,
    @CurrentUser() user: { userId: string; role: string; phone: string },
    @Req() req: Request,
  ) {
    const rental = await this.prisma.orderItem.findFirst({
      where: {
        lockerId,
        status: { in: ['ACTIVE', 'OVERDUE'] },
        order: { userId: user.userId },
      },
      include: {
        tariff: true,
        order: true
      }
    });
    
    if (!rental) {
      throw new ForbiddenException('Аренда не найдена');
    }

    const now = new Date();
    const endTime = rental.endAt ? new Date(rental.endAt) : null;
    
    // Проверяем, можно ли открыть ячейку
    if (rental.status === 'ACTIVE' && endTime && endTime > now) {
      // Аренда активна и не истекла
    } else if (rental.status === 'OVERDUE' || (endTime && endTime <= now)) {
      // Аренда истекла, проверяем льготный период
      if (endTime) {
        const gracePeriodMinutes = await this.settingsService.getGracePeriodMinutes(rental.tariff.code as 'HOURLY' | 'DAILY');
        const gracePeriodEnd = new Date(endTime.getTime() + gracePeriodMinutes * 60 * 1000);
        
        if (now > gracePeriodEnd) {
          throw new ForbiddenException('Льготный период для открытия истек');
        }
      }
    } else {
      throw new ForbiddenException('Аренда не активна');
    }

    // Открываем ячейку
    await this.lockersService.openLocker(lockerId, {
      actorId: user.userId,
      actorType: ActorType.USER,
      source: 'PAID',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Завершаем аренду
    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: rental.id },
        data: { status: 'CLOSED' },
      });
      await tx.locker.update({
        where: { id: lockerId },
        data: { status: 'FREE' },
      });
    });

    return { success: true };
  }
}
