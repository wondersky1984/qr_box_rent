import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, ActorType } from '@prisma/client';
import { CreateLockerDto } from './dto/create-locker.dto';
import { UpdateLockerDto } from './dto/update-locker.dto';
import { LockersService } from '../lockers/lockers.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../../common/decorators/user.decorator';

@Controller('api/admin/lockers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminLockersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lockersService: LockersService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  list() {
    return this.lockersService.getLockers();
  }

  @Post()
  async create(@Body() dto: CreateLockerDto, @CurrentUser() user: { userId: string }) {
    const locker = await this.prisma.locker.create({
      data: {
        number: dto.number,
        deviceId: dto.deviceId,
        status: dto.status ?? 'FREE',
      },
    });
    await this.auditService.createLog({
      actorType: ActorType.ADMIN,
      actorId: user.userId,
      action: 'LOCKER_CREATE',
      lockerId: locker.id,
      metadata: { number: locker.number },
    });
    return locker;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateLockerDto, @CurrentUser() user: { userId: string }) {
    await this.lockersService.getLocker(id);
    const locker = await this.prisma.locker.update({
      where: { id },
      data: dto,
    });
    const metadata = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    await this.auditService.createLog({
      actorType: ActorType.ADMIN,
      actorId: user.userId,
      action: 'LOCKER_UPDATE',
      lockerId: id,
      metadata,
    });
    return locker;
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    await this.prisma.locker.delete({ where: { id } });
    await this.auditService.createLog({
      actorType: ActorType.ADMIN,
      actorId: user.userId,
      action: 'LOCKER_DELETE',
      lockerId: id,
    });
    return { success: true };
  }
}
