import { Body, Controller, Get, Param, Post, UseGuards, Req } from '@nestjs/common';
import { LockersService } from '../lockers/lockers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, ActorType } from '@prisma/client';
import { FreezeLockerDto } from './dto/freeze-locker.dto';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { Request } from 'express';

@Controller('api/manager/lockers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MANAGER, Role.ADMIN)
export class ManagerLockersController {
  constructor(private readonly lockersService: LockersService) {}

  @Get()
  list() {
    return this.lockersService.getLockers();
  }

  @Post(':id/open')
  async open(
    @Param('id') lockerId: string,
    @CurrentUser() user: { userId: string; role: Role },
    @Req() req: Request,
  ) {
    await this.lockersService.openLocker(lockerId, {
      actorId: user.userId,
      actorType: user.role === Role.ADMIN ? ActorType.ADMIN : ActorType.MANAGER,
      source: 'ADMIN',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true };
  }

  @Post(':id/freeze')
  async freeze(
    @Param('id') lockerId: string,
    @Body() dto: FreezeLockerDto,
    @CurrentUser() user: { userId: string; role: Role },
    @Req() req: Request,
  ) {
    await this.lockersService.freezeLocker(
      lockerId,
      dto.until ? new Date(dto.until) : undefined,
      dto.reason,
      {
        actorId: user.userId,
        actorType: user.role === Role.ADMIN ? ActorType.ADMIN : ActorType.MANAGER,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
    return { success: true };
  }

  @Post(':id/unfreeze')
  async unfreeze(
    @Param('id') lockerId: string,
    @CurrentUser() user: { userId: string; role: Role },
    @Req() req: Request,
  ) {
    await this.lockersService.unfreezeLocker(lockerId, {
      actorId: user.userId,
      actorType: user.role === Role.ADMIN ? ActorType.ADMIN : ActorType.MANAGER,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true };
  }
}
