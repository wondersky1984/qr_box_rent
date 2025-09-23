import { Controller, Get, Param, Query, Post, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { LockersService } from './lockers.service';
import { GetLockersQueryDto } from './dto/get-lockers-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActorType } from '@prisma/client';
import { Request } from 'express';

@Controller('api/lockers')
export class LockersController {
  constructor(private readonly lockersService: LockersService, private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() query: GetLockersQueryDto) {
    return this.lockersService.getLockers(query);
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
        status: 'ACTIVE',
        order: { userId: user.userId },
        endAt: { gt: new Date() },
      },
    });
    if (!rental) {
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
}
